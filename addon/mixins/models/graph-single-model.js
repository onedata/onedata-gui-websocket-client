/**
 * Adds properties and methods specific to single (non-list) records
 *
 * @author Michał Borzęcki, Jakub Liput
 * @copyright (C) 2018-2024 ACK CYFRONET AGH
 * @copyright (C) 2025 Onedata (onedata.org)
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
 * @property {boolean} [reloadRecords] If true, reload method reloads each record from the
 *   list that has been already loaded into the store.
 * @property {boolean} [forceInit] If true, load data if the list was not loaded earlier.
 */

/**
 * @type {ReloadRecordListOptions}
 */
const defaultReloadRecordListOptions = Object.freeze({
  reloadRecords: false,
  forceInit: false,
});

export default Mixin.create(GraphModel, {
  batchRequestRegistry: service(),
  recordRegistry: service(),

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
   * Async init for record - loads other records necessary to fulfill data of this record.
   * In most models it is not used. Models which use it, will have some fields empty until
   * these relations are fetched. In some cases, it is intended to fetch these relation
   * lazily, eg. when there are large number of records and the fields are not yet needed.
   * In some cases, there is a need to fully resolve model data - so this interface could
   * be used for each record in collection.
   * @virtual
   * @returns {Promise<void>}
   */
  async loadRequiredRelations() {},

  /**
   * Reloads list relation of record. If list has not been fetched, nothing is reloaded.
   * Optionally, you can enable `reloadRecords` which reloads each record from the list
   * that has been already loaded into the store.
   * @param {string} listName
   * @param {ReloadRecordListOptions} [options]
   * @returns {Promise}
   */
  async reloadList(listName, options) {
    const { store, recordRegistry } = this;
    const { reloadRecords, forceInit } = {
      ...defaultReloadRecordListOptions,
      ...options,
    };
    let listRecord = this.belongsTo(listName).value();
    if (forceInit || listRecord) {
      if (listRecord) {
        await listRecord.reload();
      } else {
        listRecord = await this[listName];
      }
      if (!reloadRecords) {
        return listRecord;
      }
      const itemsGris = listRecord.hasMany('list').ids();
      const container = await this.createContainerForListRecord(listRecord);
      try {
        const recordsInStore = itemsGris
          .map(gri => {
            const modelName = recordRegistry.getModelName(gri);
            return modelName ? store.peekRecord(modelName, gri) : null;
          })
          .filter(Boolean);
        for (const record of recordsInStore) {
          record.reload();
        }
        // force list fetching while batch containers are made
        listRecord.list;
        await container.flush();
      } finally {
        this.batchRequestRegistry.destroyContainer(container);
      }
      return (await listRecord.list) ?? listRecord;
    }
  },

  /**
   * Loads all records of list relation of this record using batch.
   * @param {string} listName Eg. "groupList"
   * @returns {ManyArray}
   */
  async loadList(listName) {
    const listRecord = await this[listName];
    const container = await this.createContainerForListRecord(listRecord);
    try {
      listRecord.list;
      await container.flush();
    } finally {
      this.batchRequestRegistry.destroyContainer(container);
    }
    return await listRecord.list;
  },

  /**
   * Should return array of GRIs for required relations fetched with
   * `loadRequiredRelations`.
   * @returns {Array<string>}
   */
  getRequiredRelationsGris() {
    return [];
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

  /**
   * @private
   * @param {GraphListModel} listRecord
   * @returns {BatchRequestContainter}
   */
  async createContainerForListRecord(listRecord) {
    const itemsGris = listRecord.hasMany('list').ids();
    const containerSpec = new GrisBatchContainerSpec(
      OwsGraphOperation.Get,
      itemsGris
    );
    return await this.batchRequestRegistry.createContainer(
      containerSpec,
      DebouncedBatchFlushStrategy
    );
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
