/**
 * Adds properties and methods specific to single (non-list) records
 *
 * @module mixins/models/graph-single-model
 * @author Michał Borzęcki
 * @copyright (C) 2018-2020 ACK CYFRONET AGH
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

  /**
   * Should be called just after loading record and be a part of record loading promise.
   * @virtual
   * @returns {Promise}
   */
  loadRequiredRelations() {
    return resolve();
  },

  /**
   * Query relationship record and throw error when it fails - in contrary to using
   * get on relationship, which fails silently, returns null and leaves null in
   * relationship. Note that this method will reload the record if the relationship
   * is null or an error occurs when loading relationship.
   * @param {String} relationName 
   * @param {String} relationType one of: belongsTo, hasMany
   * @returns {Promise<Model>}
   */
  getRelation(relationName, relationType = 'belongsTo') {
    const store = this.get('store');
    const relationship = this[relationType](relationName);
    const relationGri = relationship.id();
    const griPromise = relationGri ?
      resolve(relationGri) :
      this.reload().then(() => relationship.id());
    const relationModelType = relationship.belongsToRelationship.relationshipMeta.type;
    return griPromise.then(gri => store.findRecord(relationModelType, gri)
      .catch(error => this.reload().then(() => {
        throw error;
      }))
    );
  },
});
