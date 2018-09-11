/**
 * Onedata Websocket Sync API - Graph level service
 *
 * @module services/onedata-graph
 * @author Jakub Liput, Michal Borzecki
 * @copyright (C) 2017-2018 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Service, { inject as service } from '@ember/service';

import { Promise } from 'rsvp';
import Evented from '@ember/object/evented';

export default Service.extend(Evented, {
  onedataWebsocket: service(),

  init() {
    this._super(...arguments);
    const onedataWebsocket = this.get('onedataWebsocket');
    onedataWebsocket.on('push:graph', this, this.handlePush);
    onedataWebsocket.on('push:nosub', this, this.handleNosub);
  },

  /**
   * @param {string} gri
   * @param {string} operation one of: get, create, update, delete
   * @param {object} data
   * @param {[String,String]} authHint [HintType, Id of subject]
   * @param {boolean} subscribe
   * @returns {Promise<object, object>} resolves with Onedata Graph resource
   *   (typically record data)
   */
  request({
    gri,
    operation,
    data,
    authHint,
    subscribe = true,
  }) {
    subscribe = operation === 'get' || operation === 'create' ? subscribe : false;
    return new Promise((resolve, reject) => {
      let message = {
        gri,
        operation,
        data,
        subscribe,
      };
      if (authHint) {
        if (Array.isArray(authHint) && authHint.length === 2) {
          message.authHint = authHint.join(':');
        } else {
          throw new Error('service:onedata-graph: invalid authHint');
        }
      }
      let requesting = this.get('onedataWebsocket').sendMessage('graph', message);
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
    });
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
   * @param {string|undefined} authHint
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
});
