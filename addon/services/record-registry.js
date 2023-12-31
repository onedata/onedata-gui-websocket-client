/**
 * Registry with all records available for the application. Contains information
 * about relations between records IDs and model names.
 *
 * @author Michał Borzęcki
 * @copyright (C) 2018 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Service from '@ember/service';
import { computed } from '@ember/object';

export default Service.extend({
  /**
   * @type {Ember.ComputedProperty<Map<string,string>>}
   */
  modelNameMapping: computed(function modelNameMapping() {
    return new Map();
  }),

  /**
   * Registers id in registry
   * @param {string} id
   * @param {string} modelName
   * @returns {undefined}
   */
  registerId(id, modelName) {
    this.get('modelNameMapping').set(id, modelName);
  },

  /**
   * Returns model name related to given id
   * @param {string} id
   * @returns {string|undefined}
   */
  getModelName(id) {
    return this.get('modelNameMapping').get(id);
  },
});
