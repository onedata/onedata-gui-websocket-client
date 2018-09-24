/**
 * Globally stores mapping of records to other records that should be used for
 * authHint.
 * 
 * Glossary:
 * - `requestedGri` is GRI (which is used as a record ID) of record, that needs
 *    using an `authHint` on `findRecord`
 * - `contextGri` is GRI (record ID) of record, that serves as an `authHint` for
 *    finding other record
 * - `originGri` is GRI (record ID) of a record which introduced pair
 *   (`requestedGri`, `contextGri`). Usually it is GRI of a list record, that
 *   connects related records (`requestedGri`[]) to some parent record
 *   (`contextGri`).
 *
 * Every `requestedGri` can be theoretically fetched by multiple `contextGri`s,
 * so a list of `contextGri`s is stored for each `requestedGri`.
 * It's indifferent which `contextGri` will be used for fetching `requestedGri`
 * as long as `contextGri` is valid (the record exists, user has permissions to
 * it and it still can be used as an authHint for `requestedGri`).
 * 
 * Mapping between `requestedGri` and `contextGri` is stored in `findRecordContext`
 * property. It is a map requestedGri: string -> array of objects in format:
 * ```
 * {
 *   contextGri: string,
 *   originGris: Array<string|null>
 * }
 * ```
 * Entries with empty `originGris` array are automatically removed. null value in
 * the `originGris` array means, that the mapping was obtained in some way that
 * did not use any intermediate (list)record.
 *
 * The `registerArray` method is used automatically by serializer, and `deregister`
 * should be used when record is removed from store (either by conscious
 * `destroyRecord` or when removed from store by push).
 *
 * @module services/onedata-graph-context
 * @author Jakub Liput, Michal Borzecki
 * @copyright (C) 2017-2018 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Service from '@ember/service';
import authHintGet from 'onedata-gui-websocket-client/utils/auth-hint-get';
import { get } from '@ember/object';
import { A } from '@ember/array';
import _ from 'lodash';

export default Service.extend({
  /**
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
   * @param {string|null} originGri GRI (just record id)
   * @returns {undefined}
   */
  register(requestedGri, contextGri, originGri = null) {
    const authHintThrough = authHintGet(contextGri);
    // do not register context if it is incorrect
    if (!authHintThrough) {
      return;
    }
    let contexts = this.get('findRecordContext');
    let registeredContexts = contexts.get(requestedGri);
    if (registeredContexts == null) {
      registeredContexts = A();
      contexts.set(requestedGri, registeredContexts);
    }
    let actualContext = registeredContexts.findBy('contextGri', contextGri);
    if (!actualContext) {
      actualContext = {
        contextGri,
        originGris: [],
      };
      registeredContexts.pushObject(actualContext);
    }
    const originGris = get(actualContext, 'originGris');
    if (!originGris.includes(originGri)) {
      originGris.push(originGri);
    }
  },

  /**
   * Runs register method over an array of GRI
   * @param {Array<string>} requestedGriArray array of GRI
   * @param {string} contextGri GRI (just record id)
   * @param {string} originGri GRI (just record id)
   * @param {boolean} removeContextForOthers if true, combination of contextGri
   *   and originGri for GRI different than in requestedGriArray will be removed
   * @returns {undefined}
   */
  registerArray(
    requestedGriArray,
    contextGri,
    originGri,
    removeContextForOthers = true
  ) {
    const findRecordContext = this.get('findRecordContext');
    requestedGriArray.forEach(requestedGri =>
      this.register(requestedGri, contextGri, originGri)
    );
    if (removeContextForOthers) {
      findRecordContext.forEach((value, key) => {
        if (!requestedGriArray.includes(key) &&
          value.findBy('contextGri', contextGri)) {
          this.deregister(contextGri, originGri, key);
        }
      });
    }
  },

  /**
   * Removes GRI from context of all possible (or one specified) requestedGri
   * @param {string} contextId GRI or entityId
   * @param {string|null} originGri GRI (just record id). If null, then the
   *   whole context entry is removed regardless of originGris content
   * @param {string|null} requestedGri GRI (just record id)
   * @returns {undefined}
   */
  deregister(contextId, originGri = null, requestedGri = null) {
    let contexts = this.get('findRecordContext');
    if (requestedGri) {
      const context = contexts.get(requestedGri);
      contexts = context ? [context] : [];
    }
    contexts.forEach(registeredContexts =>
      _.remove(registeredContexts, actualContext => {
        if (get(actualContext, 'contextGri').includes(contextId)) {
          if (originGri === null) {
            return true;
          } else {
            const originGris = get(actualContext, 'originGris');
            _.pull(originGris, originGri);
            return !get(originGris, 'length');
          }
        }
      })
    );
  },

  /**
   * Take last registered contextGri for some requestedGri
   * @param {String} requestedId
   * @returns {String} gri of collection record that holds record with requestedId
   */
  getContext(requestedId) {
    const registeredContexts = this.get('findRecordContext').get(requestedId);
    const lastContext = (registeredContexts &&
      registeredContexts[registeredContexts.length - 1]) || {};
    return get(lastContext, 'contextGri');
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
