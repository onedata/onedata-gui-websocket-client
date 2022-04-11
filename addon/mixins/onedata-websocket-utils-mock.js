/**
 * Additional util functions that facilitate usage of onedata-websocket service
 * Implements functions needed by `authenticator:onedata-websocket` for development
 * environment
 *
 * @module mixins/onedata-websocket-utils-mock
 * @author Jakub Liput
 * @copyright (C) 2017 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Mixin from '@ember/object/mixin';
import { inject } from '@ember/service';
import { resolve, reject } from 'rsvp';

export default Mixin.create({
  cookies: inject(),

  getIsAutheticated() {
    return this.get('cookies').read('is-authenticated') === 'true';
  },

  /**
   * @override
   * @returns {Promise<object>} resolves with session data
   */
  initWebSocketConnection(type) {
    const isAuthenticated = this.getIsAutheticated();
    const user = 'stub_user_id';
    if (type === 'authenticated') {
      if (isAuthenticated) {
        return resolve({
          version: 1,
          sessionId: 'stub_session_id',
          identity: { user },
          attributes: {},
        });
      } else {
        return reject();
      }
    }
  },

  /**
   * @override
   * @returns {Promise<undefined>}
   */
  forceCloseConnection() {
    return resolve();
  },

  /**
   * @returns {Promise<string>}
   */
  getToken() {
    return this.getIsAutheticated() ? resolve('mock-token') : reject();
  },
});
