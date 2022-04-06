/**
 * Onedata Websocket Sync API - Graph level service
 *
 * @module services/onedata-graph
 * @author Jakub Liput, Michał Borzęcki
 * @copyright (C) 2017-2020 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Service, { inject as service } from '@ember/service';
import { computed } from '@ember/object';
import { Promise, resolve } from 'rsvp';
import Evented from '@ember/object/evented';
import { later, cancel } from '@ember/runloop';
import Request from 'onedata-gui-websocket-client/utils/request';

export default Service.extend(Evented, {
  onedataWebsocket: service(),
  activeRequests: service(),

  /**
   * Time delay in milliseconds after which scheduled unsubscription
   * will be executed.
   * @type {number}
   */
  unsubscriptionDelay: 5000,

  /**
   * Map with scheduled unsubscriptions. It maps gri to timer returned from
   * `later()` Ember function so the unsubscription could be cancelled.
   * @type {Ember.ComputedProperty<Map<string,Object>>}
   */
  scheduledUnsubscriptions: computed(function scheduledUnsubscriptions() {
    return new Map();
  }),

  init() {
    this._super(...arguments);
    const onedataWebsocket = this.get('onedataWebsocket');
    onedataWebsocket.on('push:graph', this, this.handlePush);
    onedataWebsocket.on('push:nosub', this, this.handleNosub);
  },

  /**
   * @param {String} gri
   * @param {String} operation one of: get, create, update, delete
   * @param {Object} data
   * @param {[String,String]} authHint [HintType, Id of subject]
   * @param {boolean} subscribe
   * @param {String} [requestName]
   * @returns {Promise<Object, Object>} resolves with Onedata Graph resource
   *   (typically record data)
   */
  request({
    gri,
    operation,
    data,
    authHint,
    subscribe = true,
  }) {
    const {
      onedataWebsocket,
      activeRequests,
    } = this.getProperties('onedataWebsocket', 'activeRequests');
    const requestData = arguments[0];

    const promise = this.getRequestPrerequisitePromise(requestData).then(() =>
      new Promise((resolve, reject) => {
        const effSubscribe = operation === 'get' ||
          operation === 'create' ? subscribe : false;
        const message = {
          gri,
          operation,
          data,
          subscribe: effSubscribe,
        };
        if (authHint) {
          if (Array.isArray(authHint) && authHint.length === 2) {
            message.authHint = authHint.join(':');
          } else {
            throw new Error('service:onedata-graph: invalid authHint');
          }
        }
        this.removeScheduledUnsubscription(gri);
        const requesting = onedataWebsocket.sendMessage('graph', message);
        requesting.then(({ payload: { success, data: payloadData, error } }) => {
          if (success) {
            if (!payloadData) {
              resolve();
            } else {
              switch (payloadData.format) {
                case 'resource':
                  resolve(payloadData.resource);
                  break;
                case 'value':
                  resolve(payloadData.value);
                  break;
                default:
                  resolve();
              }
            }
          } else {
            reject(error);
          }
        });
        requesting.catch(reject);
      })
    );

    activeRequests.addRequest(Request.create({
      promise,
      type: 'graph',
      data: requestData,
    }));

    return promise;
  },

  /**
   * @param {string} gri gri of model, which should be unsubscribed
   * @returns {boolean} false if unsubscription has been already scheduled
   * for specified model, true otherwise
   */
  scheduleUnsubscription(gri) {
    const {
      scheduledUnsubscriptions,
      unsubscriptionDelay,
    } = this.getProperties(
      'scheduledUnsubscriptions',
      'unsubscriptionDelay'
    );

    if (scheduledUnsubscriptions.has(gri)) {
      return false;
    } else {
      const timer = later(this, 'unsubscribe', gri, unsubscriptionDelay);
      scheduledUnsubscriptions.set(gri, timer);
      return true;
    }
  },

  /**
   * Removes scheduled unsubscription
   * @param {string} gri
   * @returns {boolean} true, if there was a scheduled unsubscription for
   * given gri
   */
  removeScheduledUnsubscription(gri) {
    const scheduledUnsubscriptions = this.get('scheduledUnsubscriptions');
    const timer = scheduledUnsubscriptions.get(gri);

    if (timer !== undefined) {
      cancel(timer);
      scheduledUnsubscriptions.delete(gri);
      return true;
    } else {
      return false;
    }
  },

  /**
   * @param {string} gri gri of model, which should be unsubscribed
   * @returns {Promise} resolves after successfull unsubscription
   */
  unsubscribe(gri) {
    const onedataWebsocket = this.get('onedataWebsocket');

    this.removeScheduledUnsubscription(gri);

    const message = { gri };
    return onedataWebsocket.sendMessage('unsub', message);
  },

  /**
   * @param {object} payload payload of push message from server
   * @param {string} payload.updateType type of push, one of: updated, deleted
   * @param {string} payload.gri GRI of entity to update/delete
   * @param {object|undefined} payload.data if updateType is updated: object
   *   containing properties to change in record; undefined otherwise
   *
   * @returns {undefined}
   */
  handlePush({ updateType, gri, data }) {
    switch (updateType) {
      case 'updated':
      case 'deleted':
        this.trigger(`push:${updateType}`, gri, data);
        break;
      default:
        throw new Error(
          `service:onedata-graph: not supported push update type: ${updateType}`
        );
    }
  },

  /**
   * @param {object} payload payload of push message from server
   * @param {string} payload.reason reason of nosub. For now the only valid
   *   value is: forbidden
   * @param {string} payload.gri GRI of entity
   * @param {string|undefined} payload.authHint authHint
   *
   * @returns {undefined}
   */
  handleNosub({ reason, gri, authHint }) {
    switch (reason) {
      case 'forbidden':
        this.trigger(`push:${reason}`, gri, authHint);
        break;
      default:
        throw new Error(
          `service:onedata-graph: not supported push nosub reason: ${reason}`
        );
    }
  },

  /**
   * Returns promise, that should fulfill before GraphSync request will occur.
   * @param {Object} requestData GraphSync request data
   * @returns {Promise}
   */
  getRequestPrerequisitePromise( /*requestData*/ ) {
    return resolve();
  },
});
