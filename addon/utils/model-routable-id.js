/**
 * Returns id for passed record, that can be used for routing purposes
 * (inside link-to helper, transitionTo function, etc).
 *
 * @module utils/model-routable-id
 * @author Michal Borzecki, Jakub Liput
 * @copyright (C) 2018-2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import { get } from '@ember/object';
import parseGri from 'onedata-gui-websocket-client/utils/parse-gri';

/**
 * @param {object|string} record 
 * @returns {string}
 */
export default function modelRoutableId(record) {
  record = record || {};
  const recordId = typeof record === 'string' ? record : get(record, 'id');
  try {
    return parseGri(recordId).entityId;
  } catch (err) {
    return null;
  }
}
