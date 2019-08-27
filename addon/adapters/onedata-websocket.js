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
import { reject } from 'rsvp';
import createGri from 'onedata-gui-websocket-client/utils/gri';
import parseGri from 'onedata-gui-websocket-client/utils/parse-gri';
import _ from 'lodash';

export default Adapter.extend({
  onedataGraph: service(),
  onedataGraphContext: service(),
  recordRegistry: service(),

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
      subscribe,
    } = this.getProperties('onedataGraph', 'onedataGraphContext', 'subscribe');

    const authHint = get(snapshot, 'adapterOptions._meta.authHint') ||
      onedataGraphContext.getAuthHint(id);
    const record = get(snapshot, 'record') || {};

    return onedataGraph.request({
      gri: id,
      operation: 'get',
      authHint,
      subscribe,
    }).then(graphData => {
      console.debug(
        `adapter:onedata-websocket: findRecord, gri: ${id}, returned data: `,
        `${JSON.stringify(graphData)}`,
      );
      // request is successful so access to the resource is not forbidden
      if (get(record, 'isForbidden')) {
        set(record, 'isForbidden', false);
      }
      return graphData;
    }).catch(findError => {
      if (get(findError, 'id') === 'forbidden') {
        return this.searchForNextContext(id, !!authHint)
          .catch(() => {
            if (!get(record, 'isForbidden')) {
              set(record, 'isForbidden', true);
            }
            throw findError;
          });
      } else {
        throw findError;
      }
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
    const {
      onedataGraph,
      subscribe,
      createScope,
    } = this.getProperties('onedataGraph', 'subscribe', 'createScope');

    const data = snapshot.record.toJSON();
    const modelName = type.modelName;

    // support for special metadata for requests in onedata-websocket
    // supported:
    // - authHint: Array.String: 2-element array, eg. ['asUser', <user_id>]
    //   note that user_id is _not_ a gri, but stripped raw id
    // - additionalData: Object|null additional fields, that will be added
    //   to the `data` in request
    let authHint;
    if (snapshot.record._meta) {
      const meta = snapshot.record._meta;
      
      authHint = meta.authHint;
      
      if (meta.additionalData) {
        _.assign(data, meta.additionalData);
      }
    }

    return onedataGraph.request({
      gri: createGri({
        entityType: modelName,
        aspect: 'instance',
        scope: createScope,
      }),
      operation: 'create',
      data,
      authHint,
      subscribe,
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
    const onedataGraph = this.get('onedataGraph');
    const data = snapshot.record.toJSON();
    const recordId = snapshot.record.id;
    const griData = parseGri(recordId);
    griData.scope = 'private';
    return onedataGraph.request({
      gri: createGri(griData),
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
    const {
      onedataGraph,
      onedataGraphContext,
    } = this.getProperties('onedataGraph', 'onedataGraphContext');
    let recordId = snapshot.record.id;
    const griData = parseGri(recordId);
    griData.scope = 'private';
    return onedataGraph.request({
      gri: createGri(griData),
      operation: 'delete',
    }).then(result => {
      onedataGraphContext.deregister(recordId);
      return result;
    });
  },

  findAll() {
    throw new Error('adapter:onedata-websocket: findAll is not supported');
  },

  query() {
    throw new Error('adapter:onedata-websocket: query is not supported');
  },

  pushUpdated(gri, data) {
    const store = this.get('store');
    const modelName = this.getModelName(gri);
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
    const modelName = this.getModelName(gri);
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
    const modelName = this.getModelName(gri);
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
      this.searchForNextContext(gri, !!authHint)
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
   * @param {boolean} allowEmptyAuthHint if true, at the end of checking chain
   *   empty authHint will be used
   * @returns {Promise} resolves with successful request result, rejects if
   *   none of available contexts allows to reach specified resource
   */
  searchForNextContext(gri, allowEmptyAuthHint = true) {
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
    }).catch(error => {
      console.debug(
        `adapter:onedata-websocket: cannot subscribe to ${gri} using authHint ${authHint}, returned data :`,
        `${JSON.stringify(error)}`,
      );
      if (contextGri) {
        onedataGraphContext.deregister(contextGri, null, gri);
      }
      return this.searchForNextContext(gri, allowEmptyAuthHint && !!contextGri);
    });
  },

  /**
   * Returns model name for given GRI.
   * WARNING: It uses entityType from GRI if record was not fetched earlier.
   * EntityType does not always map directly to model name.
   * @param {string} gri
   * @returns {string}
   */
  getModelName(gri) {
    return this.get('recordRegistry').getModelName(gri) || parseGri(gri).entityType;
  },
});
