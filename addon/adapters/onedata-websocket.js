/**
 * Uses `service:onedata-graph` for CRUD operations on Onedata model
 *
 * @module adapters/onedata-websocket
 * @author Jakub Liput, Michał Borzęcki
 * @copyright (C) 2017-2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import { get, set, getProperties } from '@ember/object';
import { isArray } from '@ember/array';
import { inject as service } from '@ember/service';
import Adapter from 'ember-data/adapter';
import AdapterBase from 'onedata-gui-websocket-client/mixins/adapters/adapter-base';
import { reject, allSettled } from 'rsvp';
import createGri from 'onedata-gui-websocket-client/utils/gri';
import parseGri from 'onedata-gui-websocket-client/utils/parse-gri';
import Request from 'onedata-gui-websocket-client/utils/request';
import _ from 'lodash';

export default Adapter.extend(AdapterBase, {
  onedataGraph: service(),
  onedataGraphContext: service(),
  recordRegistry: service(),
  activeRequests: service(),

  subscribe: true,

  createScope: 'auto',

  defaultSerializer: 'onedata-websocket',

  init() {
    this._super(...arguments);
    const onedataGraph = this.get('onedataGraph');
    onedataGraph.on('push:updated', this, this.pushUpdated);
    onedataGraph.on('push:deleted', this, this.pushDeleted);
    onedataGraph.on('push:forbidden', this, this.pushForbidden);
  },

  destroy() {
    try {
      const onedataGraph = this.get('onedataGraph');
      onedataGraph.off('push:updated', this, this.pushUpdated);
      onedataGraph.off('push:deleted', this, this.pushDeleted);
      onedataGraph.off('push:forbidden', this, this.pushForbidden);
    } finally {
      this._super(...arguments);
    }
  },

  /**
   * @override
   * @param {DS.Store} store
   * @param {DS.Model} type
   * @param {String} id
   * @param {DS.Snapshot} snapshot
   * @returns {Promise}
   */
  findRecord(store, type, id, snapshot) {
    const {
      onedataGraph,
      onedataGraphContext,
      subscribe: adapterSubscribe,
      activeRequests,
    } = this.getProperties(
      'onedataGraph',
      'onedataGraphContext',
      'subscribe',
      'activeRequests'
    );

    const authHint = get(snapshot, 'adapterOptions._meta.authHint') ||
      onedataGraphContext.getAuthHint(id);
    const customSubscribe = get(snapshot, 'adapterOptions._meta.subscribe');
    const subscribe = customSubscribe !== undefined ?
      customSubscribe : adapterSubscribe;
    const record = get(snapshot, 'record') || {};
    const promise = this.getRequestPrerequisitePromise('fetch', type, record)
      .then(() => onedataGraph.request({
        gri: id,
        operation: 'get',
        authHint,
        subscribe,
      }))
      .then(graphData => {
        // request is successful so access to the resource is not forbidden
        if (get(record, 'isForbidden')) {
          set(record, 'isForbidden', false);
        }
        return graphData;
      })
      .catch(findError => {
        if (get(findError, 'id') === 'forbidden') {
          return this.searchForNextContext(id, {
            allowEmptyAuthHint: !!authHint,
            subscribe,
          }).catch(() => {
            if (!get(record, 'isForbidden')) {
              set(record, 'isForbidden', true);
            }
            throw findError;
          });
        } else {
          throw findError;
        }
      });

    activeRequests.addRequest(Request.create({
      promise,
      type: 'fetch',
      modelEntityId: parseGri(id).entityId,
      modelClassName: get(type, 'modelName'),
    }));

    return promise;
  },

  /**
   * @override
   * @method createRecord
   * @param {DS.Store} store
   * @param {DS.Model} type
   * @param {DS.Snapshot} snapshot
   * @returns {Promise} promise
   */
  createRecord(store, type, snapshot) {
    const {
      onedataGraph,
      subscribe,
      createScope,
      activeRequests,
    } = this.getProperties(
      'onedataGraph',
      'subscribe',
      'createScope',
      'activeRequests'
    );

    const record = get(snapshot, 'record');
    const data = this.serialize(snapshot);
    const modelName = type.modelName;

    // support for special metadata for requests in onedata-websocket
    // supported:
    // - authHint: Array.String: 2-element array, eg. ['asUser', <user_id>]
    //   note that user_id is _not_ a gri, but stripped raw id
    // - aspect, aspectId: string - custom GRI aspect to use while record creation
    // - additionalData: Object|null additional fields, that will be added
    //   to the `data` in request
    let authHint;
    let aspect = 'instance';
    let aspectId;
    if (record._meta) {
      const meta = record._meta;

      authHint = meta.authHint;
      if (meta.aspect) {
        aspect = meta.aspect;
      }
      aspectId = meta.aspectId;

      if (meta.additionalData) {
        _.assign(data, meta.additionalData);
      }
    }

    const entityType = this.getEntityTypeForModelName(modelName);
    const promise = this.getRequestPrerequisitePromise('create', type, record)
      .then(() => onedataGraph.request({
        gri: createGri({
          entityType,
          aspect,
          aspectId,
          scope: createScope,
        }),
        operation: 'create',
        data,
        authHint,
        subscribe,
      }));

    activeRequests.addRequest(Request.create({
      promise,
      type: 'create',
      modelEntityId: get(record, 'entityId'),
      model: record,
      data,
      modelClassName: get(type, 'modelName'),
    }));

    return promise;
  },

  /**
   * @override
   * @method updateRecord
   * @param {DS.Store} store
   * @param {DS.Model} type
   * @param {DS.Snapshot} snapshot
   * @returns {Promise} promise
   */
  updateRecord(store, type, snapshot) {
    const {
      onedataGraph,
      activeRequests,
    } = this.getProperties('onedataGraph', 'activeRequests');

    const record = get(snapshot, 'record');
    const data = this.serialize(snapshot);
    const recordId = record.id;
    const griData = parseGri(recordId);
    griData.scope = 'private';

    const promise = this.getRequestPrerequisitePromise('update', type, record)
      .then(() => onedataGraph.request({
        gri: createGri(griData),
        operation: 'update',
        data,
      }));

    activeRequests.addRequest(Request.create({
      promise,
      type: 'update',
      modelEntityId: get(record, 'entityId'),
      model: record,
      data,
      modelClassName: get(type, 'modelName'),
    }));

    return promise;
  },

  /**
   * @override
   * @method deleteRecord
   * @param {DS.Store} store
   * @param {DS.Model} type
   * @param {DS.Snapshot} snapshot
   * @returns {Promise} promise
   */
  deleteRecord(store, type, snapshot) {
    const {
      onedataGraph,
      onedataGraphContext,
      activeRequests,
    } = this.getProperties(
      'onedataGraph',
      'onedataGraphContext',
      'activeRequests'
    );

    const record = get(snapshot, 'record');
    const recordId = record.id;
    const griData = parseGri(recordId);
    griData.scope = 'private';

    const promise = this.getRequestPrerequisitePromise('delete', type, record)
      .then(() => onedataGraph.request({
        gri: createGri(griData),
        operation: 'delete',
      }))
      .then(result => {
        onedataGraphContext.deregister(recordId);
        return result;
      });

    activeRequests.addRequest(Request.create({
      promise,
      type: 'delete',
      modelEntityId: get(record, 'entityId'),
      model: record,
      modelClassName: get(type, 'modelName'),
    }));

    return promise;
  },

  findAll() {
    throw new Error('adapter:onedata-websocket: findAll is not supported');
  },

  query() {
    throw new Error('adapter:onedata-websocket: query is not supported');
  },

  pushUpdated(gri, data) {
    const store = this.get('store');
    const modelName = this.getModelNameForGri(gri);
    const existingRecord = store.peekRecord(modelName, gri);

    // ignore update if record is deleted or has a newer revision
    if (existingRecord) {
      const {
        isDeleted,
        revision,
      } = getProperties(existingRecord, 'isDeleted', 'revision');
      if (isDeleted || revision >= get(data, 'revision')) {
        return;
      }
    }

    const record = store.push(store.normalize(modelName, data));
    if (isArray(record)) {
      record.forEach(r => r.notifyPropertyChange('isReloading'));
    } else {
      record.notifyPropertyChange('isReloading');
    }
    return record;
  },

  pushDeleted(gri) {
    const store = this.get('store');
    const modelName = this.getModelNameForGri(gri);
    const record = store.peekRecord(modelName, gri);
    if (record && !get(record, 'isDeleted')) {
      record.deleteRecord();
      // TODO: maybe unload record, but we lost deleted flag then...
    }
  },

  pushForbidden(gri, authHint) {
    const {
      onedataGraphContext,
      store,
    } = this.getProperties('onedataGraphContext', 'store');
    const modelName = this.getModelNameForGri(gri);
    const record = store.peekRecord(modelName, gri);
    if (record && !get(record, 'isDeleted')) {
      // deregister not working context
      if (authHint) {
        const contextId = authHint.split(':')[1];
        onedataGraphContext.deregister(contextId, null, gri);
      } else {
        onedataGraphContext.deregister(gri);
      }
      // try to find another working context
      this.searchForNextContext(gri, { allowEmptyAuthHint: !!authHint })
        .then(data => this.pushUpdated(gri, data))
        .catch(() =>
          set(record, 'isForbidden', true)
        );
    }
  },

  /**
   * Looks for working context (authHint) for specified GRI. Tries each available
   * context until working one found. If some context does not work, it will be
   * removed from the list of available contexts.
   * @param {string} gri GRI
   * @param {boolean} options.allowEmptyAuthHint if true, at the end of checking chain
   *   empty authHint will be used
   * @param {boolean} options.subscribe
   * @returns {Promise} resolves with successful request result, rejects if
   *   none of available contexts allows to reach specified resource
   */
  searchForNextContext(gri, {
    allowEmptyAuthHint = true,
    subscribe = this.get('subscribe'),
  } = {}) {
    const {
      onedataGraphContext,
      onedataGraph,
    } = this.getProperties('onedataGraphContext', 'onedataGraph');
    const contextGri = onedataGraphContext.getContext(gri);
    const authHint = onedataGraphContext.getAuthHint(gri);
    if (!allowEmptyAuthHint && !authHint) {
      return reject();
    }
    console.debug(
      `adapter:onedata-websocket: trying to subscribe to ${gri} using authHint ${authHint}`
    );
    return onedataGraph.request({
      gri,
      operation: 'get',
      authHint,
      subscribe,
    }).catch(error => {
      console.debug(
        `adapter:onedata-websocket: cannot subscribe to ${gri} using authHint ${authHint}, returned data :`,
        `${JSON.stringify(error)}`,
      );
      if (contextGri) {
        onedataGraphContext.deregister(contextGri, null, gri);
      }
      return this.searchForNextContext(gri, {
        allowEmptyAuthHint: allowEmptyAuthHint && !!contextGri,
        subscribe,
      });
    });
  },

  /**
   * Returns model name for given GRI.
   * WARNING: It uses entityType from GRI if record was not fetched earlier or
   * model name cannot be inferred from `entityTypeToEmberModelNameMap`.
   * EntityType does not always map directly to model name.
   * @param {string} gri
   * @returns {string}
   */
  getModelNameForGri(gri) {
    const {
      entityTypeToEmberModelNameMap,
      recordRegistry,
    } = this.getProperties('entityTypeToEmberModelNameMap', 'recordRegistry');
    const entityType = parseGri(gri).entityType;
    return recordRegistry.getModelName(gri) ||
      entityTypeToEmberModelNameMap.get(entityType) ||
      parseGri(gri).entityType;
  },

  /**
   * Returns promise, that should fulfill before `operation` on `model`
   * will be started. Returned promise never rejects.
   * @param {string} operation one of: create, fetch, update, delete
   * @param {Object} modelClass
   * @param {GraphModel} model
   * @returns {Promise}
   */
  getRequestPrerequisitePromise(operation, modelClass, model) {
    const blockingRequests = modelClass.findBlockingRequests(
      this.get('activeRequests'),
      operation,
      model
    );
    return allSettled(blockingRequests.mapBy('promise'));
  },
});
