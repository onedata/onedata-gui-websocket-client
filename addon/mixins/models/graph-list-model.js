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
 * @author Michał Borzęcki
 * @copyright (C) 2018-2022 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Mixin from '@ember/object/mixin';
import { computed, observer } from '@ember/object';
import GraphModel from 'onedata-gui-websocket-client/mixins/models/graph-model';

export default Mixin.create(GraphModel, {
  /**
   * @type {Ember.ComputedProperty<number>}
   */
  length: computed('isLoading', 'isReloading', function length() {
    return this.hasMany('list').ids().length;
  }),

  // NOTE: tested on Ember Data 3.12.6 and this hack is still needed.
  // A hack for some ember-data change between 3.3.2 -> 3.4.0 that casued not fetching
  // hasMany item that was pushed using GraphSync update.
  // When get is done on the list, the new item is fetched. Hence we force getting
  // the list every time when array items change.
  listObserver: observer('list.[]', function listObserver() {
    if (this.store.isDestroying || this.store.isDestroyed) {
      return;
    }
    this.get('list');
  }),
});
