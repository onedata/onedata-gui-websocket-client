/**
 * Adds auto assigning of conflict labels for elements of list
 * in list record
 *
 * @module mixins/models/list-conflict-model
 * @author Jakub Liput, Michal Borzecki
 * @copyright (C) 2017-2020 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import { get, observer } from '@ember/object';
import { debounce } from '@ember/runloop';
import addConflictLabels from 'onedata-gui-common/utils/add-conflict-labels';
import Mixin from '@ember/object/mixin';

export function createConflictModelMixin(relationName) {
  return Mixin.create({
    observeConflictLabels: observer(
      `${relationName}.isFulfilled`,
      `${relationName}.content.@each.name`,
      function observeConflictLabels() {
        if (this.hasMany(relationName).value()) {
          debounce(this, '_addConflictLabels', 100);
        }
      }),

    _addConflictLabels() {
      const listContent = this.get(`${relationName}.content`);
      if (listContent && listContent.every(r => get(r, 'name') != null)) {
        addConflictLabels(
          listContent,
          'name',
          'entityId'
        );
      }
    },

    init() {
      this._super(...arguments);
      this.observeConflictLabels();
    },
  });
}

export default createConflictModelMixin('list');
