/**
 * Base for development and production, "fake" store for session: it does not
 * use local session data, but on each restore, try to use browser session
 * (cookies) to make a handshake it will response with session data.
 *
 * This is because, we do not have any information about session in browser
 * (session_id cookie is server-only)
 *
 * @author Jakub Liput
 * @copyright (C) 2017 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import { resolve } from 'rsvp';

import BaseSessionStore from 'ember-simple-auth/session-stores/base';

import _ from 'lodash';

export default BaseSessionStore.extend({

  /**
   * @virtual
   * @returns {Promise<undefined>}
   */
  forceCloseConnection() {
    throw new Error('not implemented');
  },

  persist( /* data */ ) {
    // complete ignore of persist - the "store" is remote server
    return resolve();
  },

  restore() {
    return this.forceCloseConnection()
      .then(() => this.initWebSocketConnection('authenticated'))
      .then(handshakeData => ({
        authenticated: _.merge(
          handshakeData, { authenticator: 'authenticator:one-application' }),
      }))
      .catch(() =>
        this.forceCloseConnection()
        .then(() => this.initWebSocketConnection('anonymous'))
        .then(() => {})
      );
  },
});
