/**
 * Base serializer for `adapter:onedata-websocket`
 *
 * @module serializers/onedata-websocket
 * @author Jakub Liput, Michal Borzecki
 * @copyright (C) 2017-2018 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import JSONSerializer from 'ember-data/serializers/json';
import { get, set } from '@ember/object';
import { inject as service } from '@ember/service';

export default JSONSerializer.extend({
  modelRegistry: service(),

  primaryKey: 'gri',

  extractAttributes(modelClass, resourceHash) {
    const attributes = this._super(modelClass, resourceHash);

    // Sets default values for attributes, that are optional in requests. It is
    // needed, because after reload, if some attributes disappear from the
    // payload, their values are not resetted.
    get(modelClass, 'attributes').forEach((meta, name) => {
      if (get(attributes, name) === undefined) {
        const defaultValue = get(meta, 'options.defaultValue');
        if (defaultValue !== undefined) {
          set(attributes, name, false);
        }
      }
    });

    return attributes;
  },

  normalize(typeClass, hash) {
    const result = this._super(...arguments);
    this.get('modelRegistry').registerId(
      get(hash, 'gri'),
      get(typeClass, 'modelName')
    );
    return result;
  },
});
