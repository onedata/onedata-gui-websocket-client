/**
 * Base serializer for `adapter:onedata-websocket`
 *
 * @module serializers/onedata-websocket
 * @author Jakub Liput, Michal Borzecki
 * @copyright (C) 2017-2018 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import JSONSerializer from 'ember-data/serializers/json';
import { get, set, getProperties } from '@ember/object';
import { inject as service } from '@ember/service';
import { isArray } from '@ember/array';
import _ from 'lodash';

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

    // Register relation between gri and modelName
    this.get('modelRegistry').registerId(
      get(hash, 'gri'),
      get(typeClass, 'modelName')
    );

    return result;
  },

  extractRelationships(modelClass, resourceHash) {
    const store = this.get('store');

    // Removes ids of records which are considered as deleted. It is important
    // because, due to the subscription latency, there can be an update that
    // tries to change data of a model, that is already deleted.
    modelClass.eachRelationship((key, relationshipMeta) => {
      const {
        kind,
        type,
      } = getProperties(relationshipMeta, 'kind', 'type');
      const relationshipKey = this.keyForRelationship(key, kind, 'deserialize');
      const relationshipHash = get(resourceHash, relationshipKey);

      if (kind === 'hasMany' && isArray(relationshipHash)) {
        _.remove(relationshipHash, id => {
          const record = store.peekRecord(type, id);
          return record ? get(record, 'isDeleted') : false;
        });
      }
    });
    
    return this._super(...arguments);
  },
});
