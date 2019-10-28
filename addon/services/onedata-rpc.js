/**
 * Onedata Websocket Sync API - RPC level service
 *
 * @module services/onedata-rpc
 * @author Jakub Liput, Michał Borzęcki
 * @copyright (C) 2017-2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Service, { inject as service } from '@ember/service';
import { Promise, resolve } from 'rsvp';
import Request from 'onedata-gui-websocket-client/utils/request';

export default Service.extend({
  onedataWebsocket: service(),
  activeRequests: service(),

  /**
   * @param {string} methodName
   * @param {string} args
   * @returns {Promise} resolves with method return data
   */
  request(methodName, args = {}) {
    const {
      onedataWebsocket,
      activeRequests,
    } = this.getProperties('onedataWebsocket', 'activeRequests');
    const promise = this.getRequestPrerequisitePromise(methodName, args).then(() =>
      new Promise((resolve, reject) => {
        const requesting = onedataWebsocket.sendMessage('rpc', {
          function: methodName,
          args,
        });
        requesting.then(({ payload: { success, data, error } }) => {
          if (success) {
            resolve(data);
          } else {
            reject(error);
          }
        });
        requesting.catch(reject);
      })
    );

    activeRequests.addRequest(Request.create({
      promise,
      type: 'rpc',
      data: args,
      rpcMethodName: methodName,
    }));

    return promise;
  },

  /**
   * Returns promise, that should fulfill before RPC call will occur.
   * @param {string} methodName RPC method name
   * @param {Object} [args={}] RPC method arguments
   * @returns {Promise}
   */
  getRequestPrerequisitePromise( /*methodName, args = {}*/ ) {
    return resolve();
  },
});
