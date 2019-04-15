/**
 * Custom store extension that provides functions to deal with specific
 * features of the model.
 *
 * @module services/store
 * @author Michal Borzecki
 * @copyright (C) 2018 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import { get } from '@ember/object';
import Store from 'ember-data/store';
import parseGri from 'onedata-gui-websocket-client/utils/parse-gri';
import { resolve } from 'rsvp';
import { inject as service } from '@ember/service';

export default Store.extend({
  onedataGraph: service(),

  /**
   * Iterates over all list records to reload/recalculate length. Basically it
   * should be called right after record deletion.
   * @param {string} modelName
   * @param {string} entityId entityId of the record, which existence should be
   *   checked in list records (e.g. after deletion)
   * @returns {Promise} resolves when all lists all properly reloaded/recalculated
   */
  recalculateListsWithEntity(modelName, entityId) {
    const listModelName = `${modelName}-list`;
    const records = this.peekAll(listModelName);
    return Promise.all(records.map(listModel => {
      if (!get(listModel, 'isForbidden')) {
        const ids = listModel.hasMany('list').ids();
        if (ids && ids.some(id => parseGri(id).entityId === entityId)) {
          let promise = listModel.reload();
          // reload records in list only if they have been loaded earlier
          if (listModel.hasMany('list').value()) {
            promise = promise.then(() => listModel.hasMany('list').reload());
          }
          return promise;
        } else {
          // simulate reload to recalculated properties
          listModel.notifyPropertyChange('isReloading');
          return resolve();
        }
      } else {
        return resolve();
      }
    }));
  },

  /**
   * @override
   */
  unloadRecord(record) {
    this.unsubscribeFromChanges(record);
    return this._super(...arguments);
  },

  /**
   * Cancels subscription for specified record
   * 
   * @param {GraphModel} record
   * @returns {Promise}
   */
  unsubscribeFromChanges(record) {
    const onedataGraph = this.get('onedataGraph');
    const gri = get(record, 'gri');

    return onedataGraph.scheduleUnsubscription(gri);
  },
});
