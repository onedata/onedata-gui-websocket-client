/**
 * Adds properties and methods specific to single (non-list) records
 *
 * @author Michał Borzęcki
 * @copyright (C) 2018-2024 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Mixin from '@ember/object/mixin';
import GraphModel from 'onedata-gui-websocket-client/mixins/models/graph-model';
import { resolve } from 'rsvp';
import { get, computed } from '@ember/object';
import { promise } from 'ember-awesome-macros';
import parseGri from 'onedata-gui-websocket-client/utils/parse-gri';
import isDeletedEmberError from 'onedata-gui-websocket-client/utils/is-deleted-ember-error';
import { asyncObserver as observer } from 'onedata-gui-websocket-client/utils/observer';
import { inject as service } from '@ember/service';
import GrisBatchContainerSpec from 'onedata-gui-websocket-client/utils/gris-batch-container-spec';
import { OwsGraphOperation } from 'onedata-gui-websocket-client/services/onedata-graph';
import { DebouncedBatchFlushStrategy } from 'onedata-gui-websocket-client/utils/batch-flush-strategies';

/**
 * @typedef {Object} ReloadRecordListOptions
 * @property {boolean} onlyIds If true, reload only list of items IDs, ignoring items
 *   records.
 */

/**
 * @type {ReloadRecordListOptions}
 */
const defaultReloadRecordListOptions = Object.freeze({
  onlyIds: false,
});

export default Mixin.create(GraphModel, {
  batchRequestRegistry: service(),

  /**
   * Flag automatically set to true when the record hits the deleted saved state and the
   * callback for this transition has been invoked.
   * @type {boolean}
   */
  isDeletionPersisted: false,

  listsRecalculator: observer(
    'isDeleted',
    'hasDirtyAttributes',
    'isSaving',
    function listsRecalculator() {
      const isDeletionPersisted =
        this.isDeleted &&
        !this.hasDirtyAttributes &&
        !this.isSaving;
      if (isDeletionPersisted && !this.isDeletionPersisted) {
        this.set('isDeletionPersisted', true);
        this.store.recalculateListsWithEntity(this.constructor.modelName, this.entityId);
      }
    }),

  init() {
    this._super(...arguments);
    // enable observers
    this.isDeleted;
    this.isSaving;
    this.isDirty;
  },

  /**
   * Deeply reloads list relation. If list has not been fetched, nothing is reloaded.
   * @param {string} listName
   * @param {ReloadRecordListOptions} [options]
   * @returns {Promise}
   */
  async reloadList(listName, options) {
    const { onlyIds } = { ...defaultReloadRecordListOptions, ...options };
    const listRecord = this.belongsTo(listName).value();
    if (listRecord) {
      await listRecord.reload();
      if (onlyIds) {
        return listRecord;
      }
      const hasManyReference = listRecord.hasMany('list');
      const list = hasManyReference.value();
      if (list) {
        const itemsGris = hasManyReference.ids();
        const containerSpec = new GrisBatchContainerSpec(
          OwsGraphOperation.Get,
          itemsGris
        );
        await this.batchRequestRegistry.waitForNoConflicts(containerSpec);
        const container = this.batchRequestRegistry.createContainer(
          containerSpec,
          DebouncedBatchFlushStrategy
        );
        try {
          list.reload();
          await container.flush();
        } finally {
          this.batchRequestRegistry.destroyContainer(container);
        }
      }
      return list ?? listRecord;
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
          // TODO: VFS-11407 Figure out if using `resolve()` here is really needed
          // (now it fixes oversimplified mocks in tests).
          relationPromise = resolve(get(record, relationName));
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
