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
   * @type {Map<string,string>}
   */
  entityTypeToEmberModelNameMap: Object.freeze(new Map()),

  /**
   * @type {ComputedProperty<Map<string,string>>}
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
   * @param {string} modelName dasherized or camelized model name.
   *   TODO: VFS-7620 force to use only one form for modelName
   * @returns {string}
   */
  getEntityTypeForModelName(modelName) {
    return this.get('emberModelNameToEntityTypeMap').get(dasherize(modelName)) ||
      underscore(modelName);
  },

  /**
   * Returns model name related to passed GRI entity type.
   * @param {string} entityType
   * @returns {string} dasherized model name
   */
  getModelNameForEntityType(entityType) {
    return dasherize(this.entityTypeToEmberModelNameMap.get(entityType)) ||
      dasherize(entityType);
  },
});
