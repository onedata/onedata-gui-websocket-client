/**
 * Mock of Onedata Websocket WebSocket API - Graph level service
 *
 * @module services/mocks/onedata-graph
 * @author Jakub Liput
 * @copyright (C) 2018-2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Evented from '@ember/object/evented';
import { resolve, reject } from 'rsvp';
import Service, { inject as service } from '@ember/service';
import parseGri from 'onedata-gui-websocket-client/utils/parse-gri';
import { v4 as uuid } from 'ember-uuid';

export const messageNotSupported = Object.freeze({
  success: false,
  error: { id: 'notSupported' },
  data: {},
});

export const exampleToken =
  'MDAxNWxvY2F00aW9uIG9uZXpvbmUKMDAzYmlkZW500aWZpZXIgM2E00NGx2bUM00cW5VcHAtSGx3X2NIZFhGT2ZJWXAwdG5Td1V5UEJ2LWtEMAowMDI4Y2lkIHRva2VuVHlwZSA9IHNwYWNlX3N1cHBvcnRfdG9rZW4KMDAyZnNpZ25hdHVyZSA6OiqbyenXe005Y4hXgbOYHgatNArPXTBCq01c4igkMrfAo';

/**
 * @returns {string}
 */
export function randomToken() {
  const randInt = Math.floor(Math.random() * 10000);
  return exampleToken + randInt;
}

const responseDelay = 100;

export default Service.extend(Evented, {
  store: service(),
  currentUser: service(),

  /**
   * @param {string} gri
   * @param {string} operation one of: get, update, delete
   * @param {object} data
   * @param {[String,String]} authHint [HintType, Id of subject]
   * @param {string} [subscribe=false]
   * @returns {Promise<object, object>} resolves with Onedata Graph resource
   *   (typically record data)
   */
  request({
    gri,
    operation,
    data,
    authHint,
    subscribe = false,
  }) {
    const id = uuid();
    console.debug(
      `Mock Graph request:
    - uuid: ${id}
    - gri: ${gri},
    - operation: ${operation},
    - authHint: ${JSON.stringify(authHint || null)},
    - data: ${JSON.stringify(data || null)},
    - subscribe: ${subscribe}`
    );

    return new Promise(resolve => {
      setTimeout(
        () => {
          const response = this.response({
            gri,
            operation,
            data,
            authHint,
            subscribe,
          });
          console.debug(`Mock Graph response ${id}: ${JSON.stringify(response)}`);
          return resolve(response);
        },
        responseDelay
      );
    });
  },

  /**
   * @returns {Promise}
   */
  unsubscribe() {
    return new Promise(resolve => {
      setTimeout(
        () => resolve({
          success: true,
          error: null,
          data: {},
        }),
        responseDelay
      );
    });
  },

  scheduleUnsubscription() {
    return true;
  },

  response({
    gri,
    operation,
    data,
    authHint,
  }) {
    const {
      entityType,
      entityId,
      aspect,
    } = parseGri(gri);
    const handler = this.get(`handlers.${entityType}.${aspect}`);
    if (handler) {
      const response = handler.bind(this)(operation, entityId, data, authHint);
      if (response.error) {
        return reject(response);
      } else {
        return resolve(response);
      }
    } else {
      return reject(messageNotSupported);
    }
  },

  handlers: Object.freeze({}),
});
