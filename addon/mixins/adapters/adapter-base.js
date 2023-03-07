/**
 * Introduces common functionality for onedata adapters (both production and
 * mocked).
 *
 * @author Michał Borzęcki
 * @copyright (C) 2021 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Mixin from '@ember/object/mixin';
import { computed } from '@ember/object';
import { dasherize, underscore } from '@ember/string';

export default Mixin.create({
  /**
   * @type {Map<String,String>}
   */
  entityTypeToEmberModelNameMap: Object.freeze(new Map()),

  /**
   * @type {ComputedProperty<Map<String,String>>}
   */
  emberModelNameToEntityTypeMap: computed(
    'entityTypeToEmberModelNameMap',
    function emberModelNameToEntityType() {
      const entityTypeToEmberModelNameMap = this.get('entityTypeToEmberModelNameMap');
      const emberModelNameMap = new Map();

      entityTypeToEmberModelNameMap.forEach((emberModelName, entityType) =>
        emberModelNameMap.set(emberModelName, entityType)
      );

      return emberModelNameMap;
    }
  ),

  /**
   * Returns GRI entity type related to passed model name.
   * @param {String} modelName dasherized or camelized model name.
   *   TODO: VFS-7620 force to use only one form for modelName
   * @returns {String}
   */
  getEntityTypeForModelName(modelName) {
    return this.get('emberModelNameToEntityTypeMap').get(dasherize(modelName)) ||
      underscore(modelName);
  },
});
