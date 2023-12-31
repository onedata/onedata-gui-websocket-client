/**
 * Produce first part of authHint for getting record from Onedata Graph API
 * Eg. throughSpace, throughGroup
 *
 * @author Jakub Liput, Michał Borzęcki
 * @copyright (C) 2017-2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import { camelize } from '@ember/string';

/**
 * @function authHintGet
 * @param {string} gri GRI of record to fetch from Onedata Graph API
 * @returns {string} first part of authHint
 */
export default function authHintGet(gri) {
  const griMatch = gri.match(
    /(op_)?(cluster|harvester|space|group|atm_inventory)\..*\.(users|groups|spaces|harvesters|eff_providers|providers|children|eff_users|eff_groups|eff_children|owners|instance)/
  );
  if (griMatch) {
    const modelName = griMatch[2];
    return camelize(`through-${modelName}`);
  }
}
