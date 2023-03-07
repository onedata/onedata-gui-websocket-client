import DS from 'ember-data';

/**
 * Transforms ``Object`` (frontend) <-> JSON (backend).
 *
 * It adds support for using object as a model property type.
 *
 * @author Jakub Liput
 * @copyright (C) 2016-2017 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */
export default DS.Transform.extend({
  deserialize: function (value) {
    if (value && (typeof value === 'object') && !Array.isArray(value)) {
      return value;
    } else {
      return {};
    }
  },
  serialize: function (value) {
    if (value && (typeof value === 'object') && !Array.isArray(value)) {
      return value;
    } else {
      return {};
    }
  },
});
