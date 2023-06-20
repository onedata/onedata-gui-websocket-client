/**
 * Onedata Websocket Sync API - low-level Websocket operation service
 *
 * Sent events:
 * - push:graph
 * - push:nosub
 * - push:error
 *
 * For mocked service, that does not need backend, see `onedata-websocket`
 *
 * @author Jakub Liput
 * @copyright (C) 2017-2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import { computed } from '@ember/object';
import Evented from '@ember/object/evented';
import { camelize } from '@ember/string';
import ObjectProxy from '@ember/object/proxy';
import PromiseProxyMixin from '@ember/object/promise-proxy-mixin';
import { Promise, defer } from 'rsvp';
import { isArray } from '@ember/array';
import Service, { inject as service } from '@ember/service';
import _ from 'lodash';
import safeExec from 'onedata-gui-websocket-client/utils/safe-method-execution';
import { getOwner } from '@ember/application';
import config from 'ember-get-config';

const ObjectPromiseProxy = ObjectProxy.extend(PromiseProxyMixin);

const AVAIL_MESSAGE_HANDLERS = ['response', 'push'];

const defaultProtocolVersion = config.onedataWebsocket.defaultProtocolVersion || 3;

export default Service.extend(Evented, {
  onedataWebsocketErrorHandler: service(),

  defaultProtocolVersion,

  /**
   * @type {RSVP.Deferred}
   */
  _initDefer: null,

  /**
   * @type {RSVP.Deferred}
   */
  _closeDefer: null,

  /**
   * Maps message id -> { sendDeferred: RSVP.Deferred  }
   * @type {Map}
   */
  _deferredMessages: undefined,

  /**
   * A class for creating new WebSocket object
   *
   * Set this property to custom class for mocking websocket
   * @type {class}
   */
  _webSocketClass: WebSocket,

  /**
   * @type {WebSocket}
   */
  _webSocket: null,

  /**
   * An object containing connection attributes sent after successful handshake.
   * Properties:
   * - `zoneName`: string
   * - `serviceVersion`: string (version of Zone server backend)
   * - `ipds`: string[] (id providers - names of identity providers for authentication)
   * @type {Ember.ComputedProperty<object>}
   */
  connectionAttributes: null,

  /**
   * Object promise proxy that isFulfilled when WebSocket opens
   * @type {ObjectPromiseProxy}
   */
  webSocketInitializedProxy: computed(
    '_initDefer.promise',
    function webSocketInitializedProxy() {
      const promise = this.get('_initDefer.promise');
      if (promise) {
        return ObjectPromiseProxy.create({ promise });
      }
    }
  ),

  init() {
    this._super(...arguments);
    this.set('_deferredMessages', new Map());
  },

  /**
   * @param {object} options
   * @param {number} options.protocolVersion
   * @param {string} options.token
   * @returns {Promise} resolves with success handshake message
   */
  initConnection(options) {
    return this._initNewConnection(options)
      .then(data => {
        safeExec(this, 'set', 'connectionAttributes', data.attributes);
        return data;
      });
  },

  closeConnection() {
    return this._closeConnectionStart();
  },

  resetWaitForConnectionClose() {
    this.set('_closeWaitDefer', null);
  },

  waitForConnectionClose() {
    const _closeWaitDefer = this.get('_closeWaitDefer');
    if (_closeWaitDefer) {
      return _closeWaitDefer.promise;
    } else {
      return this.set('_closeWaitDefer', defer()).promise;
    }
  },

  /**
   * The promise resolves with received message data.
   * The promise rejects on:
   * - uuid collision
   * - websocket adapter exception
   * @param {string} subtype one of: handshake, rpc, graph
   * @param {object} message
   * @returns {Promise<object, object>} resolves with Onedata Sync API response
   */
  sendMessage(subtype, message) {
    const {
      _webSocket,
      _deferredMessages,
    } = this.getProperties(
      '_webSocket',
      '_deferredMessages',
    );
    const id = this._generateUuid();
    const rawMessage = {
      id,
      type: 'request',
      subtype,
      payload: message,
    };
    const sendDeferred = defer();
    if (_deferredMessages.has(id)) {
      // TODO: reason - collision
      sendDeferred.reject({
        error: 'collision',
        details: {
          id,
        },
      });
    }
    try {
      const rawMessageString = JSON.stringify(rawMessage);
      console.debug(`onedata-websocket: Will send: ${rawMessageString}`);
      _webSocket.send(rawMessageString);
    } catch (error) {
      sendDeferred.reject({
        error: 'send-failed',
        details: {
          error,
        },
      });
    }

    _deferredMessages.set(id, { sendDeferred });
    const sendPromise = sendDeferred.promise;
    sendPromise.catch(error =>
      console.warn(
        `service:onedata-websocket: sendMessage error: ${JSON.stringify(error)}`
      )
    );
    return sendDeferred.promise;
  },

  /**
   * Creates WebSocket and opens connection
   * @param {object} options
   * @returns {Promise} resolves when websocket is opened successfully
   */
  _initWebsocket( /* options */ ) {
    const guiContext = getOwner(this).application.guiContext;
    const WebSocketClass = this.get('_webSocketClass');

    const _initDefer = defer();
    this.set('_initDefer', _initDefer);
    // force initialization of proxy
    this.get('webSocketInitializedProxy');
    const protocol = location.protocol === 'https:' ? 'wss://' : 'ws://';
    const apiOrigin = guiContext.apiOrigin;
    const suffix = '/graph_sync/gui';

    const url = protocol + apiOrigin + suffix;

    _initDefer.promise.catch((error) => {
      console.error(`Websocket initialization error: ${error}`);
    });

    try {
      const socket = new WebSocketClass(url);
      socket.onopen = this._onOpen.bind(this);
      socket.onmessage = this._onMessage.bind(this);
      socket.onerror = this._onError.bind(this);
      socket.onclose = this._onClose.bind(this);
      this.set('_webSocket', socket);
    } catch (error) {
      console.error(`WebSocket constructor or events bind error: ${error}`);
      _initDefer.reject(error);
    }

    return _initDefer.promise;
  },

  _initNewConnection(options) {
    return this._initWebsocket(options).then(() => this._handshake(options));
  },

  _closeConnectionStart() {
    const _webSocket = this.get('_webSocket');
    if (_webSocket &&
      _webSocket.readyState >= WebSocket.CONNECTING &&
      _webSocket.readyState <= WebSocket.CLOSING) {
      const _closeDefer = defer();
      this.set('_closeDefer', _closeDefer);
      _webSocket.close();
      return _closeDefer.promise
        .then(closeResult => {
          safeExec(this, 'set', 'connectionAttributes', null);
          safeExec(this, 'set', '_webSocket', null);
          return closeResult;
        });
    } else {
      // if there is no _webSocket or active connection, we assume,
      // that there is no connection at all
      const _closeWaitDefer = this.get('_closeWaitDefer');
      if (_closeWaitDefer) {
        _closeWaitDefer.resolve();
      }
      safeExec(this, 'set', '_webSocket', null);
      return Promise.resolve();
    }
  },

  _onOpen( /*event*/ ) {
    const _initDefer = this.get('_initDefer');
    _initDefer.resolve();
  },

  _onMessage({ data: dataString }) {
    const data = JSON.parse(dataString);

    if (isArray(data.batch)) {
      // not using forEach for performance
      const batch = data.batch;
      const length = batch.length;
      for (let i = 0; i < length; ++i) {
        this._handleMessage(batch[i]);
      }
    } else {
      this._handleMessage(data);
    }
  },

  /**
   * @param {object} rawOptions
   * @param {number} rawOptions.protocolVersion
   * @returns {Promise<object, object>} resolves with successful handshake data
   */
  _handshake(rawOptions) {
    const options = rawOptions || {};
    const protocolVersion = (options.protocolVersion === undefined) ?
      this.get('defaultProtocolVersion') : options.protocolVersion;
    const token = options.token;

    const handshakeData = {
      supportedVersions: [protocolVersion],
      sessionId: null,
    };

    if (token) {
      handshakeData.auth = {
        macaroon: token,
      };
    }

    return new Promise((resolve, reject) => {
      const handshaking = this.sendMessage('handshake', handshakeData);
      handshaking.then(({ payload: { success, data, error } }) => {
        if (success) {
          resolve(data);
        } else {
          reject(error);
        }
      });
      handshaking.catch(reject);
    });
  },

  _onError(errorEvent) {
    this.get('_initDefer').reject();
    const openingCompleted = this.get('webSocketInitializedProxy.isFulfilled');
    this.get('onedataWebsocketErrorHandler').errorOccured(
      errorEvent,
      openingCompleted,
    );
  },

  _onClose(closeEvent) {
    const _closeDefer = this.get('_closeDefer');
    const _closeWaitDefer = this.get('_closeWaitDefer');
    if (_closeWaitDefer) {
      _closeWaitDefer.resolve();
    }
    if (_closeDefer) {
      _closeDefer.resolve();
      safeExec(this, 'set', '_closeDefer', null);
    } else {
      const openingCompleted = this.get('webSocketInitializedProxy.isFulfilled');
      this.get('_initDefer').reject();
      if (!_closeWaitDefer) {
        this.get('onedataWebsocketErrorHandler').abnormalClose(
          closeEvent,
          openingCompleted
        );
      }
    }
  },

  /**
   * Generates a random uuid of message
   * @returns {string}
   */
  _generateUuid() {
    let date = new Date().getTime();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,
      function (character) {
        const random = (date + Math.random() * 16) % 16 | 0;
        date = Math.floor(date / 16);
        return (character === 'x' ? random : random & 0x7 | 0x8).toString(16);
      });
  },

  _MESSAGE_HANDLERS: _.zipObject(
    AVAIL_MESSAGE_HANDLERS,
    AVAIL_MESSAGE_HANDLERS.map(t => '_' + camelize(`handle-${t}-message`))
  ),

  /**
   * @param {object} message
   * @returns {undefined}
   */
  _handleMessage(message) {
    console.debug(`onedata-websocket: Handling message: ${JSON.stringify(message)}`);
    const {
      type,
    } = message;

    const handler = this[this._MESSAGE_HANDLERS[type]];

    if (typeof handler === 'function') {
      handler.bind(this)(message);
    } else {
      throw `No handler for message type: ${type}`;
    }
  },

  /**
   * Handles a push message from server
   * - some messages are error responses for requests, these are used to reject
   *   promises
   * - some messages are regular push messages with various subtypes - they cause
   *   an event to be sent (`push:<subtype>`), eg. `push:graph`
   * @param {object} message
   * @returns {undefined}
   */
  _handlePushMessage(message) {
    // HACK convert push error message to response message
    const badMessageId = this._badMessageId(message);
    if (badMessageId) {
      const badMessage = _.assign({}, message, { id: badMessageId, type: 'response' });
      this._handleResponseMessage(badMessage);
    } else {
      this.trigger(`push:${message.subtype}`, message.payload);
    }
  },

  _handleResponseMessage(message) {
    const _deferredMessages = this.get('_deferredMessages');
    const {
      id,
    } = message;
    if (_deferredMessages.has(id)) {
      const { sendDeferred } = _deferredMessages.get(id);
      // NOTE Map.delete will not work on IE 10 or lower
      _deferredMessages.delete(id);
      sendDeferred.resolve(message);
    } else {
      console.warn(
        `Tried to handle message with unknown UUID: ${id} - maybe there was a timeout?`
      );
    }
  },

  /**
   * Helper: if response reports badMessage error, return id of bad message
   * @param {string} message
   * @returns {string|undefined}
   */
  _badMessageId(message) {
    if (
      message.type === 'push' &&
      message.payload &&
      message.payload.error &&
      message.payload.error.id === 'badMessage'
    ) {
      const requestMessage = JSON.parse(message.payload.error.details.message);
      return requestMessage.id;
    } else {
      return undefined;
    }
  },
});
