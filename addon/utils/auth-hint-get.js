/**
 * Produce first part of authHint for getting record from Onedata Graph API
 * Eg. throughSpace, throughGroup
 *
 * @module utils/auth-hint-get
 * @author Jakub Liput
 * @copyright (C) 2017 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import { camelize } from '@ember/string';

/**
 * @function authHintGet
 * @param {string} gri GRI of record to fetch from Onedata Graph API
 * @returns {string} first part of authHint
 */
export default function authHintGet(gri) {
  let griMatch = gri.match(
    /(cluster|harvester|space|group)\..*\.(users|groups|spaces|children|eff_users|eff_groups|eff_children)/
  );
  if (griMatch) {
    let modelName = griMatch[1];
    return camelize(`through-${modelName}`);
  }
}
