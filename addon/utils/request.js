/**
 * A class that represents request triggered by Ember Store or RPC call.
 *
 * @author Michał Borzęcki
 * @copyright (C) 2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import EmberObject from '@ember/object';

export default EmberObject.extend({
  /**
   * @virtual
   * @type {Promise}
   */
  promise: undefined,

  /**
   * One of: create, fetch, update, delete, rpc, graph
   * @virtual
   * @type {string}
   */
  type: undefined,

  /**
   * @type {string}
   * Only in CRUD requests
   */
  modelEntityId: undefined,

  /**
   * @type {GraphModel}
   * Only in CRUD requests
   */
  model: undefined,

  /**
   * @type {string}
   * Only in CRUD requests
   */
  modelClassName: undefined,

  /**
   * @type {string}
   * Only in RPC requests
   */
  rpcMethodName: undefined,

  /**
   * @type {DS.Model|Object}
   * Data passed with request (e.g. model body in create request, RPC args in
   * RPC requests, whole graph request data in graph requests).
   */
  data: undefined,
});
