/**
 * Adds properties and methods specific to single (non-list) records
 *
 * @module mixins/models/graph-single-model
 * @author Michal Borzecki
 * @copyright (C) 2018 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Mixin from '@ember/object/mixin';
import GraphModel from 'onedata-gui-websocket-client/mixins/models/graph-model';
import { resolve } from 'rsvp';

export default Mixin.create(GraphModel, {
  didDelete() {
    this._super(...arguments);
    this.get('store').recalculateListsWithEntity(
      this.get('constructor.modelName'),
      this.get('entityId')
    );
  },

  /**
   * Deeply reloads list relation. If list has not been fetched, nothing is
   * reloaded.
   * @param {string} listName 
   * @returns {Promise}
   */
  reloadList(listName) {
    const list = this.belongsTo(listName).value();
    if (list) {
      const hasMany = list.hasMany('list').value();
      return list.reload().then(result => {
        return hasMany ? list.hasMany('list').reload() : result;
      });
    } else {
      return resolve();
    }
  },
});
