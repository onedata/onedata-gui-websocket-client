/**
 * Returns id for passed record, that can be used for routing purposes
 * (inside link-to helper, transitionTo function, etc).
 *
 * @author Michał Borzęcki, Jakub Liput
 * @copyright (C) 2018-2024 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import parseGri from 'onedata-gui-websocket-client/utils/parse-gri';

/**
 * @param {object|string} recordOrGri
 * @returns {string}
 */
export default function modelRoutableId(recordOrGri) {
  let recordGri;
  if (typeof recordOrGri === 'string') {
    recordGri = recordOrGri;
  } else {
    if (recordOrGri?.entityId) {
      return recordOrGri.entityId;
    } else {
      recordGri = recordOrGri?.id;
    }
  }
  try {
    return parseGri(recordGri).entityId;
  } catch (err) {
    return null;
  }
}
