/**
 * Globally stores mapping of records to other records that should be used for
 * authHint
 *
 * Only ids are stored. The `register` method is used automatically by serializer,
 * and `deregister` should be used when record is removed from store (either by
 * conscious `destroyRecord` or when removed from store by push.
 *
 * Glossary:
 * - `requestedGri` is GRI (which is used as a record ID) of record, that needs
 *    using an `authHint` on `findRecord`
 * - `contextGri` is GRI (record ID) of record, that serves as an `authHint` for
 *    finding other record
 *
 * Every `requestedGri` can be theoretically fetched by multiple `contextGri`s,
 * so a list of `contextGri`s is stored for each `requestedGri`.
 * It's indifferent which `contextGri` will be used for fetching `requestedGri`
 * as long as `contextGri` is valid (the record exists, user has permissions to
 * it and it still can be used as an authHint for `requestedGri`).
 *
 * TODO: implement auto remove of contextGris in above situations
 * TODO: remove
 *
 * @module services/onedata-graph-context
 * @author Jakub Liput
 * @copyright (C) 2017 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Service from '@ember/service';
import authHintGet from 'onedata-gui-websocket-client/utils/auth-hint-get';
import _ from 'lodash';

export default Service.extend({
  /**
   * Maps: recordId (String) -> list of internal Id of record that
   *   requested it (Array.String)
   * @type {Map}
   */
  findRecordContext: null,

  init() {
    this._super(...arguments);
    this.set('findRecordContext', new Map());
  },

  /**
   * Adds an entry to records mapping (see `findRecordContext` property)
   * @param {string} requestedGri GRI (just record id)
   * @param {string} contextGri GRI (just record id)
   * @returns {undefined}
   */
  register(requestedGri, contextGri) {
    const authHintThrough = authHintGet(contextGri);
    // do not register context if it is incorrect
    if (!authHintThrough) {
      return;
    }
    let contexts = this.get('findRecordContext');
    let registeredContexts = contexts.get(requestedGri);
    if (registeredContexts == null) {
      registeredContexts = [];
      contexts.set(requestedGri, registeredContexts);
    }
    if (registeredContexts.indexOf(requestedGri) === -1) {
      registeredContexts.push(contextGri);
    }
  },

  /**
   * Runs register method over array of GRI
   * @param {Array<string>} requestedGriArray array of GRI
   * @param {string} contextGri GRI (just record id)
   * @param {boolean} removeContextForOthers if true, contextGri for GRI
   *   different than in requestedGriArray will be removed
   * @returns {undefined}
   */
  registerArray(requestedGriArray, contextGri, removeContextForOthers=true) {
    const findRecordContext = this.get('findRecordContext');
    requestedGriArray.forEach(requestedGri =>
      this.register(requestedGri, contextGri)
    );
    if (removeContextForOthers) {
      findRecordContext.forEach((value, key) => {
        if (requestedGriArray.indexOf(key) === -1 && value.indexOf(contextGri) !== -1) {
          this.deregister(contextGri, key);
        }
      });
    }
  },

  /**
   * Removes GRI from context of all possible (or one specified) requestedGri
   * @param {string} contextId GRI or entityId
   * @param {string|null} requestedGri GRI (just record id)
   * @returns {undefined}
   */
  deregister(contextId, requestedGri = null) {
    let contexts = this.get('findRecordContext');
    if (requestedGri) {
      const context = contexts.get(requestedGri);
      contexts = context ? [context] : [];
    }
    contexts.forEach(registeredContexts =>
      _.remove(registeredContexts, (cid => cid.indexOf(contextId) !== -1))
    );
  },

  /**
   * Take last registered contextGri for some requestedGri
   * @param {String} requestedId
   * @returns {String} gri of collection record that holds record with requestedId
   */
  getContext(requestedId) {
    let registeredContexts = this.get('findRecordContext').get(requestedId);
    return registeredContexts && registeredContexts[registeredContexts.length - 1];
  },

  /**
   * Create complete authHint for some requestedId, based on registered context
   * @param {string} requestedId
   * @returns {Array.string} [auth hint type, context GRI]
   */
  getAuthHint(requestedId) {
    let contextId = this.getContext(requestedId);
    if (contextId) {
      let contextEntityId = contextId.match(/.*\.(.*)\..*/)[1];
      return [authHintGet(contextId), contextEntityId];
    }
  },
});
