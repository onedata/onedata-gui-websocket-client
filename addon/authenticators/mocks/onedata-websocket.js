/**
 * Uses fake cookies to authenticate in `authenticator:onedata-websocket`
 * Used in app development
 *
 * @module authenticators/mocks/onedata-websocket
 * @author Jakub Liput
 * @copyright (C) 2017 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import OnedataAuthenticatorBase from 'onedata-gui-websocket-client/authenticators/-base';
import OnedataWebsocketUtilsMock from 'onedata-gui-websocket-client/mixins/onedata-websocket-utils-mock';

import { resolve, reject } from 'rsvp';
import { inject as service } from '@ember/service';

export default OnedataAuthenticatorBase.extend(OnedataWebsocketUtilsMock, {
  cookies: service(),

  authenticate({ username, password }) {
    if (username === 'admin' && password === 'password') {
      this.get('cookies').write('is-authenticated', 'true', { path: '/' });
      return this._super(...arguments);
    } else {
      return reject();
    }
  },

  invalidate() {
    this.get('cookies').write('is-authenticated', 'false', { path: '/' });
    return resolve();
  },

  /**
   * @override
   * @returns {Promise<undefined>}
   */
  closeConnection() {
    return resolve();
  },

  getToken() {
    return resolve({ token: 'some-mock-token' });
  },
});
