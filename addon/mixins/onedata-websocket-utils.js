/**
 * Additional util functions that facilitate usage of onedata-websocket service
 * Implements functions needed by `authenticator:onedata-websocket` for production
 * environment
 *
 * @module mixins/onedata-websocket-utils
 * @author Jakub Liput
 * @copyright (C) 2017 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Mixin from '@ember/object/mixin';
import { inject as service } from '@ember/service';
import { Promise, resolve } from 'rsvp';
import getGuiAuthToken from 'onedata-gui-websocket-client/utils/get-gui-auth-token';
const NOBODY_IDENTITY = 'nobody';

export default Mixin.create({
  onedataWebsocket: service(),

  /**
   * Forces connection close on onedata-websocket service
   * @returns {Promise.Object} should always resolve
   *   (with onedata-WS close connection data or error)
   */
  forceCloseConnection() {
    const onedataWebsocket = this.get('onedataWebsocket');
    return new Promise(resolve =>
      onedataWebsocket.closeConnection().then(resolve, resolve)
    );
  },

  /**
   * @param {string} type one of:
   *  - any (use authorized if token is available, otherwise try anonymous; will
   *    fail if fetched token is invalid!)
   *  - authenticated (fails if cannot get token),
   *  - anonymous (do not try to fetch the token)
   * @returns {Promise}
   */
  initWebSocketConnection(type = 'any') {
    if (!['authenticated', 'anonymous', 'any'].includes(type)) {
      throw new Error(
        `mixin:onedata-websocket-utils#initWebSocketConnection: wrong type specified: ${type}`
      );
    }
    const onedataWebsocket = this.get('onedataWebsocket');
    const tokenPromise = (['any', 'authenticated'].includes(type)) ?
      getGuiAuthToken().then(({ token }) => token) : resolve();
    return tokenPromise
      .catch(error => {
        if (error && error.status === 401) {
          if (type === 'any') {
            return null;
          } else {
            throw {
              isOnedataCustomError: true,
              type: 'fetch-token-error',
              reason: 'unauthorized',
              error,
            };
          }
        } else {
          throw {
            isOnedataCustomError: true,
            type: 'fetch-token-error',
            reason: 'unknown',
            error,
          };
        }
      })
      .then(token => onedataWebsocket.initConnection({ token }))
      .then(data => {
        if (type === 'authenticated') {
          return this.checkHandshake(data);
        }
      });
  },

  checkHandshake(data) {
    if (typeof data !== 'object') {
      throw new Error(
        'authorizer:onedata-websocket: invalid handshake response'
      );
    }
    if (data.identity === NOBODY_IDENTITY) {
      throw new Error('onedata-websocket-utils#checkHandshake: nobody identity');
    } else {
      return data;
    }
  },
});
