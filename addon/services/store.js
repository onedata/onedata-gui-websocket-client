/**
 * Custom store extension that provides functions to deal with specific
 * features of the model.
 *
 * @module services/store
 * @author Michal Borzecki
 * @copyright (C) 2018 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import { getOwner } from '@ember/application';
import _ from 'lodash';
import Store from 'ember-data/store';
import parseGri from 'onedata-gui-websocket-client/utils/parse-gri';
import { resolve } from 'rsvp';

export default Store.extend({
  /**
   * Iterates over all list models to reload/recalculate length. Basically it
   * should be called right after record deletion.
   * @param {string} entityId entityId of the model, which existence should be
   *   checked in list models (e.g. after deletion)
   * @returns {Promise} resolves when all lists all properly reloaded/recalculated
   */
  recalculateListsWithEntity(entityId) {
    const listModelNames = getOwner(this)
      .lookup('data-adapter:main')
      .getModelTypes()
      .map(type => type.name)
      .filter(name => _.endsWith(name, '-list'));
    return Promise.all(listModelNames.map(modelName => {
      const models = this.peekAll(modelName);
      return Promise.all(models.map(listModel => {
        const ids = listModel.hasMany('list').ids();
        if (ids && ids.some(id => parseGri(id).entityId === entityId)) {
          return listModel.reload().then(() => listModel.hasMany('list').reload());
        } else {
          // simulate reload to recalculated properties
          listModel.notifyPropertyChange('isReloading');
          return resolve();
        }
      }));
    }));
  },
});
