/**
 * Uses `service:onedata-graph` for CRUD operations on Onedata model
 *
 * @module adapters/onedata-websocket
 * @author Jakub Liput, Michal Borzecki
 * @copyright (C) 2017-2018 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import { get } from '@ember/object';
import { inject as service } from '@ember/service';
import Adapter from 'ember-data/adapter';

import gri from 'onedata-gui-websocket-client/utils/gri';
import parseGri from 'onedata-gui-websocket-client/utils/parse-gri';

/**
 * Strips the object from own properties which values are null or undefined
 * Modifies input object.
 * It is not recursive!
 * @param {Object} data
 * @returns {Object} modified data object
 */
function stripObject(data) {
  for (let prop in data) {
    if (data.hasOwnProperty(prop) && data[prop] == null) {
      delete data[prop];
    }
  }
  return data;
}

export default Adapter.extend({
  onedataGraph: service(),
  onedataGraphContext: service(),
  modelRegistry: service(),

  defaultSerializer: 'onedata-websocket',

  init() {
    this._super(...arguments);
    const onedataGraph = this.get('onedataGraph');
    onedataGraph.on('push:updated', this, this.pushUpdated);
    onedataGraph.on('push:deleted', this, this.pushDeleted);
  },

  destroy() {
    try {
      const onedataGraph = this.get('onedataGraph');
      onedataGraph.off('push:updated', this, this.pushUpdated);
      onedataGraph.off('push:deleted', this, this.pushDeleted);
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
    let {
      onedataGraph,
      onedataGraphContext,
    } = this.getProperties('onedataGraph', 'onedataGraphContext');

    let authHint = get(snapshot, 'adapterOptions._meta.authHint') ||
      onedataGraphContext.getAuthHint(id);

    return onedataGraph.request({
      gri: id,
      operation: 'get',
      authHint,
    }).then(graphData => {
      console.debug(
        `adapter:onedata-websocket: findRecord, gri: ${id}, returned data: `,
        `${JSON.stringify(graphData)}`,
      );
      return graphData;
    });

  },

  /**
   * @override
   * @method createRecord
   * @param {DS.Store} store
   * @param {DS.Model} type
   * @param {DS.Snapshot} snapshot
   * @return {Promise} promise
   */
  createRecord(store, type, snapshot) {
    let onedataGraph = this.get('onedataGraph');
    let data = snapshot.record.toJSON();
    let modelName = type.modelName;

    // support for special metadata for requests in onedata-websocket
    // supported:
    // - authHint: Array.String: 2-element array, eg. ['asUser', <user_id>]
    //   note that user_id is _not_ a gri, but stripped raw id
    let authHint;
    if (snapshot.record._meta) {
      let meta = snapshot.record._meta;
      authHint = meta.authHint;
    }

    stripObject(data);

    return onedataGraph.request({
      gri: gri({
        entityType: modelName,
        aspect: 'instance',
      }),
      operation: 'create',
      data,
      authHint,
    });
  },

  /**
   * @override
   * @method updateRecord
   * @param {DS.Store} store
   * @param {DS.Model} type
   * @param {DS.Snapshot} snapshot
   * @return {Promise} promise
   */
  updateRecord(store, type, snapshot) {
    let onedataGraph = this.get('onedataGraph');
    let data = snapshot.record.toJSON();
    let recordId = snapshot.record.id;
    stripObject(data);
    const griData = parseGri(recordId);
    griData.scope = 'private';
    return onedataGraph.request({
      gri: gri(griData),
      operation: 'update',
      data,
    });
  },

  /**
   * @override
   * @method deleteRecord
   * @param {DS.Store} store
   * @param {DS.Model} type
   * @param {DS.Snapshot} snapshot
   * @return {Promise} promise
   */
  deleteRecord(store, type, snapshot) {
    let onedataGraph = this.get('onedataGraph');
    let recordId = snapshot.record.id;
    const griData = parseGri(recordId);
    griData.scope = 'private';
    return onedataGraph.request({
      gri: gri(griData),
      operation: 'delete',
    });
  },

  findAll() {
    throw new Error('adapter:onedata-websocket: findAll is not supported');
  },

  query() {
    throw new Error('adapter:onedata-websocket: query is not supported');
  },

  pushUpdated(gri, data) {
    const {
      store,
      modelRegistry,
    } = this.getProperties('store', 'modelRegistry');
    let modelName = modelRegistry.getModelName(gri);
    if (!modelName) {
      modelName = parseGri(gri).entityType;
    }
    return store.push(store.normalize(modelName, data));
  },

  pushDeleted(gri) {
    const store = this.get('store');
    let modelName = this.get('modelRegistry').getModelName(gri);
    if (!modelName) {
      modelName = parseGri(gri).entityType;
    }
    const record = store.peekRecord(modelName, gri);
    if (record && !get(record, 'isDeleted')) {
      record.deleteRecord();
      // TODO: maybe unload record, but we lost deleted flag then...
    }
  },
});
