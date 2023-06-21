/**
 * Additional util functions that facilitate usage of onedata-websocket service
 * Implements functions needed by `authenticator:onedata-websocket` for production
 * environment
 *
 * @author Jakub Liput
 * @copyright (C) 2017 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Mixin from '@ember/object/mixin';
import { inject as service } from '@ember/service';
import { Promise, race } from 'rsvp';
import getGuiAuthToken from 'onedata-gui-websocket-client/utils/get-gui-auth-token';
const NOBODY_IDENTITY = 'nobody';

export default Mixin.create({
  onedataWebsocket: service(),

  /**
   * Max time in milliseconds to get an authentication token.
   * @type {number}
   */
  tokenGetMaxDuration: 20000,

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
  async initWebSocketConnection(type = 'any') {
    if (!['authenticated', 'anonymous', 'any'].includes(type)) {
      throw new Error(
        `mixin:onedata-websocket-utils#initWebSocketConnection: wrong type specified: ${type}`
      );
    }
    let token = null;
    try {
      if (['any', 'authenticated'].includes(type)) {
        let timeout;
        const timeoutPromise = new Promise((timeoutResolve, timeoutReject) => {
          timeout = setTimeout(
            timeoutReject,
            this.tokenGetMaxDuration,
            new Error('token get timeout')
          );
        });

        const authTokenGetResult = await race([getGuiAuthToken(), timeoutPromise]);
        token = authTokenGetResult?.token;
        clearTimeout(timeout);
      }
    } catch (tokenError) {
      if (tokenError?.id === 'unauthorized') {
        if (type !== 'any') {
          throw {
            isOnedataCustomError: true,
            type: 'fetch-token-error',
            reason: 'unauthorized',
            tokenError,
          };
        }
      } else {
        throw {
          isOnedataCustomError: true,
          type: 'fetch-token-error',
          reason: 'unknown',
          tokenError,
        };
      }
    }
    const data = await this.onedataWebsocket.initConnection({ token });
    if (type === 'authenticated') {
      return this.checkHandshake(data);
    } else {
      return data;
    }
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
