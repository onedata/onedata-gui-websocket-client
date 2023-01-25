/**
 * Provides global access to signed in user record (backend data)
 *
 * @module services/current-user
 * @author Jakub Liput, Michał Borzęcki
 * @copyright (C) 2017-2020 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import { get, computed } from '@ember/object';
import { reads } from '@ember/object/computed';

import Service, { inject } from '@ember/service';
import { Promise, resolve } from 'rsvp';
import { promise } from 'ember-awesome-macros';

export default Service.extend({
  store: inject(),
  session: inject(),

  userId: reads('session.data.authenticated.identity.user'),

  /**
   * If current user is already loaded (typically after resolving `onedata` route)
   * it contains current user record. If it is not loaded yet, returns null.
   * @type {Models.User}
   */
  user: reads('userProxy.content'),

  /**
   * @type {ComputedProperty<PromiseObject<Models.User>>}
   */
  userProxy: promise.object(computed('userId', function userProxy() {
    const {
      store,
      userId,
    } = this.getProperties('store', 'userId');
    if (!userId) {
      return Promise.reject(
        'service:current-user: session unauthenticated or user id is not set'
      );
    }
    return store.findRecord(
      'user',
      store.userGri(userId), { backgroundReload: false }
    );
  })),

  /**
   * Loads currently logged in user record
   * @returns {Promise<models.User>}
   */
  getCurrentUserRecord() {
    return this.get('userProxy.promise');
  },

  /**
   * If passed entityId matches entityId of the current user, callback is called.
   * @param {string} userEntityId
   * @param {function} callback
   * @returns {Promise}
   */
  runIfThisUser(userEntityId, callback) {
    return this.getCurrentUserRecord()
      .then(user =>
        get(user, 'entityId') === userEntityId ? callback() : resolve()
      );
  },
});
