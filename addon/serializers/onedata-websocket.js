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
  recordRegistry: service(),

  primaryKey: 'gri',

  extractAttributes(modelClass, resourceHash) {
    const attributes = this._super(modelClass, resourceHash);

    // Sets default values for attributes, that are optional in requests. It is
    // needed, because after reload, if some attributes disappear from the
    // payload, their values are not reset.
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

    const modelName = get(typeClass, 'modelName');
    const gri = get(hash, 'gri');

    const record = this.get('store').peekRecord(modelName, gri);
    if (record) {
      // Replace all unchanged (the same as in local record) values in
      // normalized hash with values from record itself. It prevents from
      // unnecessary recalculations due to changed reference of the array/object.
      const incomingAttrs = get(result, 'data.attributes');
      Object.keys(incomingAttrs).forEach(key => {
        const recordValue = get(record, key);
        if (_.isEqual(recordValue, get(incomingAttrs, key))) {
          set(incomingAttrs, key, recordValue);
        }
      });
    }

    // Register relation between gri and modelName
    this.get('recordRegistry').registerId(gri, modelName);

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

  /**
   * Omits serializing values if they are not changed
   * @override
   */
  serializeAttribute(snapshot, json, key /*, attribute */ ) {
    const record = get(snapshot, 'record');

    if (record.changedAttributes()[key]) {
      return this._super(...arguments);
    }
  },

  /**
   * Omits serializing empty relations in newly created records
   * @override
   */
  serializeBelongsTo(snapshot, json, relationship) {
    const key = get(relationship, 'key');
    const record = get(snapshot, 'record');
    const isNewRecord = !get(record, 'id');
    const belongsToId = snapshot.belongsTo(key, { id: true });

    if (!(isNewRecord && belongsToId == null)) {
      return this._super(...arguments);
    }
  },
});
