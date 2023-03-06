/**
 * An authenticator for `ember-simple-auth` that uses Onedata WebSocket API
 *
 * Using `onedata-websocket` service internally
 *
 * @author Jakub Liput
 * @copyright (C) 2017-2018 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import OnedataBaseAuthenticator from 'onedata-gui-websocket-client/authenticators/-base';
import OnedataWebsocketUtils from 'onedata-gui-websocket-client/mixins/onedata-websocket-utils';
import { reject } from 'rsvp';

import { inject as service } from '@ember/service';

export default OnedataBaseAuthenticator.extend(OnedataWebsocketUtils, {
  onedataWebsocket: service(),

  /**
   * @override
   * @param {Object} options
   * @param {string} options.username
   * @param {string} options.password
   */
  authenticate({ username, password }) {
    return ((username && password) ? doLogin(username, password) : reject())
      .then(() => this.forceCloseConnection())
      .then(() => this.initWebSocketConnection('authenticated'));
  },

  /**
   * @override
   * @returns {Promise<undefined>}
   */
  closeConnection() {
    return this.get('onedataWebsocket').closeConnection(...arguments);
  },
});

/**
 * Makes REST request to create authenticated HTTP session
 * @param {string} username
 * @param {string} password
 * @returns {Promise} a promise which resolves when username and password are
 *   valid and session is created; rejects otherwise
 */
async function doLogin(username, password) {
  const response = await window.fetch('/login', {
    method: 'POST',
    headers: {
      authorization: `Basic ${btoa(`${username}:${password}`)}`,
    },
  });

  if (!response.ok) {
    let loginError;
    try {
      loginError = (await response.json())?.error;
    } catch (error) {
      console.error('Cannot parse JSON from response due to error:', error);
      throw response.status === 401 ? { id: 'unauthorized' } : { id: 'unknown' };
    }

    throw loginError;
  }
}
