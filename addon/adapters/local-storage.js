/**
 * Override some methods of `ember-local-storage` adapter to be compatible
 * with Onedata backend
 *
 * @module adapters/local-storage
 * @author Jakub Liput
 * @copyright (C) 2017-2018 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import LocalstorageAdapter from 'ember-local-storage/adapters/local';
import gri from 'onedata-gui-websocket-client/utils/gri';
import { Promise } from 'rsvp';
import { later } from '@ember/runloop';

const responseDelay = 0;

export default LocalstorageAdapter.extend({
  _storageKey() {
    return decodeURIComponent(this._super(...arguments));
  },

  findRecord() {
    return delayResponse(this._super(...arguments));
  },

  createRecord() {
    return delayResponse(this._super(...arguments));
  },

  updateRecord() {
    return delayResponse(this._super(...arguments));
  },

  deleteRecord() {
    return delayResponse(this._super(...arguments));
  },

  /**
   * @override
   * @param {any} store 
   * @param {string} type 
   * @param {any} inputProperties 
   * @returns {string}
   */
  generateIdForRecord(store, type, inputProperties) {
    let aspect;
    let entityType;
    if (type.match(/.*-list/)) {
      entityType = 'unknown';
      aspect = type.match(/(.*)-list/)[1] + 's';
    } else {
      entityType = type;
      aspect = 'instance';
    }
    return gri({
      entityType,
      entityId: this._super(...arguments),
      aspect,
      scope: inputProperties.scope ? 'auto' : undefined,
    });
  },

  findAll() {
    throw new Error('adapter:local-storage: findAll is not supported');
  },

  query() {
    throw new Error('adapter:local-storage: query is not supported');
  },

  /**
   * Returns GRI entity type related to passed model name.
   * @param {string} modelName
   * @returns {string}
   */
  getEntityTypeForModelName(modelName) {
    return modelName;
  },
});

function delayResponse(response) {
  if (responseDelay) {
    return new Promise((resolve) => {
      later(this, () => resolve(response), responseDelay);
    });
  } else {
    return response;
  }
}
