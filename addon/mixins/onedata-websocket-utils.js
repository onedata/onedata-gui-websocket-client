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
import { reject } from 'rsvp';

const NOBODY_IDENTITY = 'nobody';

export default Mixin.create({
  onedataWebsocket: service(),

  /**
   * Forces connection close on onedata-websocket service
   * @returns {Promise.Object} should always resolve
   *   (with onedata-WS close connection data or error)
   */
  forceCloseConnection() {
    let onedataWebsocket = this.get('onedataWebsocket');
    return new Promise(resolve =>
      onedataWebsocket.closeConnection().then(resolve, resolve)
    );
  },

  /**
   * Try to get the token to connect with backend WebSocket and see if we got
   * anonymous or non-anonymous session.
   * Resolve on non-anonymous session, reject otherwise (if: no browser session,
   * so cannot fetch token, or using token causes to estabilish anonymous session).
   * @returns {Promise.Object} resolves with handshake data (Object)
   */
  tryHandshake() {
    let onedataWebsocket = this.get('onedataWebsocket');
    return this.getToken()
      .catch(error => {
        if (!error || error.status !== 401) {
          console.error(`Error on fetching authentication token: ${error}`);
        }
        return null;
      })
      .then(token => onedataWebsocket.initConnection({ token }))
      .then(data => {
        if (typeof data !== 'object') {
          throw new Error(
            'authorizer:onedata-websocket: invalid handshake response'
          );
        }
        if (data.identity === NOBODY_IDENTITY) {
          return reject();
        } else {
          return data;
        }
      });
  },

  getToken() {
    return new Promise((resolve, reject) => $.ajax('/gui-token', {
        method: 'POST',
        contentType: 'application/json; charset=utf-8',
        dataType: 'json',
        data: JSON.stringify({
          serviceId: 'onezone',
          serviceType: 'onezone',
        }),
      }).then(resolve, reject))
      .then(({ token }) => token);
  },
});
