/**
 * Adds properties and methods specific to single (non-list) records
 *
 * @author Michał Borzęcki
 * @copyright (C) 2018-2023 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Mixin from '@ember/object/mixin';
import GraphModel from 'onedata-gui-websocket-client/mixins/models/graph-model';
import { resolve } from 'rsvp';
import { get, computed, observer } from '@ember/object';
import { promise } from 'ember-awesome-macros';
import parseGri from 'onedata-gui-websocket-client/utils/parse-gri';
import isDeletedEmberError from '../../utils/is-deleted-ember-error';

export default Mixin.create(GraphModel, {
  isDeletedObserver: observer('isDeleted', function isDeletedObserver() {
    if (this.isDeleted) {
      this.store.recalculateListsWithEntity(this.constructor.modelName, this.entityId);
    }
  }),

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
   * @param {Object} [options]
   * @param {Boolean} [options.reload] reload flag passed to `findRecord`
   * @param {Boolean} [options.allowNull] if true, lack of relationship id does not cause error
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
            if (isDeletedEmberError(error)) {
              // make custom Ember error that occurs, when resource was deleted
              // in the same session, "easier to consume"
              throw { id: 'notFound' };
            } else {
              throw error;
            }
          }));
      }
    });
  },

  /**
   * Strips belongsTo relation ID to entityId
   * @param {String} relationName
   * @returns {String}
   */
  relationEntityId(relationName) {
    const relationGri = this.belongsTo(relationName).id();
    if (relationGri) {
      return parseGri(relationGri).entityId;
    }
  },
});

/**
 * Creates computed property for EmberObject that uses `getRelation` to fetch record
 * relation record.
 * @param {String} recordPath property path to record in this
 * @param {*} relationName
 * @param {Object} options the same as in `getRelation` plus:
 *  - computedRelationErrorProperty: String - property path for saving fetch error
 * @returns {Promise<Ember.Model>}
 */
export function computedRelationProxy(recordPath, relationName, options) {
  const loadErrorProperty = options && options.computedRelationErrorProperty;
  /**
   * Key of property in which private data for this computed property will be stored
   * in owner instance.
   */
  const computedPropertyUuid = `__${(recordPath + '__' + relationName).replace('.', '_')}__`;
  return promise.object(computed(
    `${recordPath}.${relationName}`,
    async function relationProxy() {
      if (!this[computedPropertyUuid]) {
        this[computedPropertyUuid] = {
          // used only if `options.computedRelationErrorProperty` is not provided
          privateLoadError: null,
          currentPromise: null,
        };
      }
      /** Private data of computed property for owner instance.*/
      const data = this[computedPropertyUuid];
      const record = this.get(recordPath);
      const loadError = loadErrorProperty ?
        this.get(loadErrorProperty) : data.privateLoadError;

      if (data.currentPromise) {
        if (get(record, 'isReloading')) {
          if (loadError) {
            throw loadError;
          } else {
            return data.currentPromise;
          }
        } else {
          return data.currentPromise;
        }
      }

      // do not try to resolve relation after previous error, because this leads to
      // infinite value computation loop
      if (loadError) {
        throw loadError;
      }

      let relationPromise;
      if (record) {
        if (typeof record.getRelation === 'function') {
          relationPromise = record.getRelation(relationName, options);
        } else {
          console.warn(
            `mixin:graph-single-model#computedRelationProxy: no getRelation for ${recordPath}, ${relationName} - falling back to get property by path`
          );
          relationPromise = get(record, relationName);
        }
      } else {
        relationPromise = resolve(null);
      }
      data.currentPromise = relationPromise;
      relationPromise.catch(error => {
        if (loadErrorProperty) {
          this.set(loadErrorProperty, error);
        } else {
          data.privateLoadError = error;
        }
        throw error;
      });
      relationPromise.finally(() => {
        data.currentPromise = null;
      });
      return relationPromise;
    }));
}
