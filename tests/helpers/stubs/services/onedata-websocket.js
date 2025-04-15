/**
 * Onedata Websocket Sync API - base of mocked low-level Websocket operation service
 *
 *  This mock will not work if send handlers are not implemented, see:
 * `service:mocks/onedata-websocket` for ready-to-use mock when developing
 *
 * For real service, see `onedata-websocket`
 *
 * @author Jakub Liput
 * @copyright (C) 2017-2025 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Service from '@ember/service';
import { Promise } from 'rsvp';
import { camelize } from '@ember/string';
import Evented from '@ember/object/evented';

export default Service.extend(Evented, {
  initPromise: null,
  closePromise: null,

  handshakeData: undefined,

  init() {
    this._super(...arguments);
    this.set('handshakeData', {
      version: 1,
      sessionId: 'test-session-id',
      identity: { user: 'test-user-id' },
      attributes: {},
    });
  },

  initConnection(options) {
    return this._initNewConnection(options);
  },

  closeConnection() {
    return this._closeConnectionStart();
  },

  _initNewConnection() {
    return this.set(
      'initPromise',
      this.sendMessage('handshake')
    );
  },

  _closeConnectionStart() {
    return this.set(
      'closePromise',
      Promise.resolve()
    );
  },

  /**
   * Resolves immediately
   * @override
   */
  handleSendHandshake() {
    return Promise.resolve(this.get('handshakeData'));
  },

  /**
   * @virtual
   * @throws {Error} not implemented
   * @returns {undefined}
   */
  handleSendRpc() {
    throw new Error(
      'service:mocks/onedata-websocket: handleSendRpc not implemented ' +
      '- in development you should use service:mocks/onedata-rpc instead, ' +
      'in tests you should stub this method if needed'
    );
  },

  /**
   * @virtual
   * @throws {Error} not implemented
   * @returns {undefined}
   */
  handleSendGraph() {
    throw new Error(
      'service:mocks/onedata-websocket: handleSendGraph not implemented ' +
      '- in development you should use development version of store instead' +
      'in tests you should stub this method if needed'
    );
  },

  /**
   * Please implement or override send handlers:
   * - `handleSendHandshake`
   * - `handleSendRpc`
   * - `handleSendGraph`
   * @param {OwsMessageSubtype} subtype
   * @param {OwsRequestPayload} payload
   * @returns {Promise<OwsMessage>}
   */
  sendMessage(subtype, payload) {
    const handlerFun = this[camelize(`handle-send-${subtype}`)];
    if (handlerFun) {
      return handlerFun.bind(this)(payload);
    } else {
      throw new Error(
        `service:onedata-websocket-mock: sendMessage not implemented for type ${subtype}`
      );
    }
  },
});
