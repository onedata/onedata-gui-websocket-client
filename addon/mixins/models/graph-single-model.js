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
import { get, computed } from '@ember/object';
import { promise } from 'ember-awesome-macros';

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
   * @param {Boolean} [reload] reload flag passed to `findRecord`
   * @param {Boolean} [allowNull] if true, lack of relationship id does not cause error
   * @returns {Promise<Model>}
   */
  getRelation(relationName, { allowNull = false, reload = false } = {}) {
    const store = this.get('store');
    const relationship = this.belongsTo(relationName);
    const relationGri = relationship.id();
    const griPromise = relationGri ?
      resolve(relationGri) :
      this.reload().then(() => {
        const gri = relationship.id();
        if (gri) {
          return gri;
        } else if (allowNull) {
          return null;
        } else {
          console.error(
            `mixin:models/graph-single-model: relation ${relationName} of ${this.constructor.modelName} ${this.get('id')} is null`
          );
          throw { id: 'forbidden' };
        }
      });
    const relationModelType =
      get(relationship, 'belongsToRelationship.relationshipMeta.type');
    return griPromise.then(gri => {
      if (gri == null) {
        return null;
      } else {
        return store.findRecord(relationModelType, gri, { reload })
          .catch(error => this.reload().then(() => {
            throw error;
          }));
      }
    });
  },
});

export function computedRelationProxy(recordPath, relationName, options) {
  return promise.object(computed(`${recordPath}.${relationName}`,
    function relationProxy() {
      const record = this.get(recordPath);
      let promise;
      if (record) {
        if (typeof record.getRelation === 'function') {
          promise = record.getRelation(relationName, options);
        } else {
          console.warn(
            `mixin:graph-single-model#computedRelationProxy: no getRelation for ${recordPath}, ${relationName} - falling back to get property by path`
          );
          promise = get(record, relationName);
        }
      } else {
        promise = resolve(null);
      }
      return promise;
    }
  ));
}
