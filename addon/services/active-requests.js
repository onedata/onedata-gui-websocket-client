/**
 * A global registry service with all backend-related active requests.
 * Notice: requests should be added using addRequest method. Internal collections
 * are readonly.
 *
 * @module services/active-requests
 * @author Michał Borzęcki
 * @copyright (C) 2019-2020 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Service from '@ember/service';
import { computed, getProperties } from '@ember/object';
import { A } from '@ember/array';
import { union } from '@ember/object/computed';

export default Service.extend({
  /**
   * @type {Ember.ComputedProperty<Ember.A<Utils.Request>>}
   */
  createRequests: computed(() => A()),

  /**
   * @type {Ember.ComputedProperty<Ember.A<Utils.Request>>}
   */
  fetchRequests: computed(() => A()),

  /**
   * @type {Ember.ComputedProperty<Ember.A<Utils.Request>>}
   */
  updateRequests: computed(() => A()),

  /**
   * @type {Ember.ComputedProperty<Ember.A<Utils.Request>>}
   */
  deleteRequests: computed(() => A()),

  /**
   * @type {Ember.ComputedProperty<Ember.A<Utils.Request>>}
   */
  rpcRequests: computed(() => A()),

  /**
   * @type {Ember.ComputedProperty<Ember.A<Utils.Request>>}
   */
  graphRequests: computed(() => A()),

  /**
   * @type {Ember.ComputedProperty<Ember.A<Utils.Request>>}
   */
  allRequests: union(
    'createRequests',
    'fetchRequests',
    'updateRequests',
    'deleteRequests',
    'rpcRequests',
    'graphRequests'
  ),

  /**
   * @public
   * @param {Utils.Request} request 
   * @returns {undefined}
   */
  addRequest(request) {
    const {
      type,
      promise,
    } = getProperties(request, 'type', 'promise');
    const targetCollection = this.get(`${type}Requests`);
    if (targetCollection) {
      targetCollection.addObject(request);
      promise.finally(() => targetCollection.removeObject(request));
    }
  },
});
