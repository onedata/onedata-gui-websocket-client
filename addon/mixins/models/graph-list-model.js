/**
 * Adds length property to the list record. Thanks to that, we can know how many
 * entities are in the list without really fetching them.
 *
 * WARNING: length of the list is not recalculated when store deletes data
 * from the list e.g. after destroyRecord (because hasMany('list').ids()
 * is not observable). Because of that after record deletion length calculation
 * should be started manually by calling `notifyPropertyChange('isReloading')`
 * on the list record.
 *
 * @module mixins/models/graph-list-model
 * @author Michal Borzecki
 * @copyright (C) 2018 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Mixin from '@ember/object/mixin';
import { computed } from '@ember/object';
import GraphModel from 'onedata-gui-websocket-client/mixins/models/graph-model';
import { observer } from '@ember/object';

export default Mixin.create(GraphModel, {
  /**
   * @type {Ember.ComputedProperty<number>}
   */
  length: computed('isLoading', 'isReloading', function length() {
    return this.hasMany('list').ids().length;
  }),

  // A hack for some ember-data change between 3.3.2 -> 3.4.0 that casued not fetching
  // hasMany item that was pushed using GraphSync update.
  // When the list is get the new item is fetched, so we force getting the list
  // every time when array items change.
  listObserver: observer('list.[]', function listObserver() {
    this.get('list');
  }),
});
