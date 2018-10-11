/**
 * Represents a relation between two records - parent and child.
 *
 * @module utils/membership-relation
 * @author Michal Borzecki
 * @copyright (C) 2018 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import EmberObject, { computed, observer, get } from '@ember/object';
import { and, reads } from '@ember/object/computed';
import parseGri from 'onedata-gui-websocket-client/utils/parse-gri';

export default EmberObject.extend({
  /**
   * @type {Group|Space}
   */
  parent: undefined,

  /**
   * @type {User|Group}
   */
  child: undefined,

  /**
   * If true, relation really exists
   * @type {Ember.ComputedProperty<boolean>}
   */
  exists: undefined,

  /**
   * @type {string}
   */
  parentType: reads('parent.entityType'),

  /**
   * @type {string}
   */
  childType: reads('child.entityType'),

  /**
   * @type {Ember.ComputedProperty<string>}
   */
  parentListName: computed(
    'parentType',
    'childType',
    function parentListName() {
      const {
        parentType,
        childType,
      } = this.getProperties('parentType', 'childType');
      if (parentType === 'space') {
        return 'spaceList';
      } else if (childType === 'group') {
        return 'parentList';
      } else {
        return 'groupList';
      }
    }
  ),

  /**
   * @type {Ember.ComputedProperty<string>}
   */
  childListName: computed(
    'parentType',
    'childType',
    function parentListName() {
      const {
        parentType,
        childType,
      } = this.getProperties('parentType', 'childType');
      if (childType === 'user') {
        return 'userList';
      } else if (parentType === 'group') {
        return 'childList';
      } else {
        return 'groupList';
      }
    }
  ),

  /**
   * @type {Ember.ComputedProperty<boolean>}
   */
  canViewPrivileges: and('exists', 'parent.canViewPrivileges'),

  listNamesObserver: observer(
    'parentListName',
    'childListName',
    function listNamesObserver() {
      const {
        parentListName,
        childListName,
      } = this.getProperties(
        'parentListName',
        'childListName'
      );
      this.set('exists', computed(
        `parent.${childListName}.{list.[],isReloading}`,
        `child.${parentListName}.{list.[],isReloading}`,
        function () {
          return this.checkExistence();
        }
      ));
    }
  ),

  init() {
    this._super(...arguments);
    this.listNamesObserver();
  },

  /**
   * Returns true if relation really exists
   * @returns {boolean}
   */
  checkExistence() {
    const {
      parent,
      child,
      parentListName,
      childListName,
      parentType,
      childType,
    } = this.getProperties(
      'parent',
      'child',
      'parentListName',
      'childListName',
      'parentType',
      'childType'
    );

    if (parentType === 'group' && childType === 'group') {
      const hasParentViewPrivilege = get(parent, 'hasViewPrivilege');
      const hasChildViewPrivilege = get(child, 'hasViewPrivilege');
      // If we cannot get relation information, then we can't assume that
      // relation exists
      if (!hasChildViewPrivilege && !hasParentViewPrivilege) {
        return true;
      }
    }

    // We need to check both children and parents lists if possible, because
    // they can update separatedly and there may be a situation when one list does
    // not satisfy relation while the second one does it (because it
    // is outdated).

    const parentIds = this.getListEntityIds(child, parentListName);
    const childIds = this.getListEntityIds(parent, childListName);
    const parentId = get(parent, 'entityId');
    const childId = get(child, 'entityId');

    if (parentIds && childIds) {
      return parentIds.indexOf(parentId) !== -1 &&
        childIds.indexOf(childId) !== -1;
    } else if (parentIds) {
      return parentIds.indexOf(parentId) !== -1;
    } else if (childIds) {
      return childIds.indexOf(childId) !== -1;
    } else {
      return true;
    }
  },

  /**
   * Returns array of entityIds, that are located in `listName` list inside record.
   * @param {GraphSingleModel} record 
   * @param {string} listName
   * @returns {Array<string>} entity ids
   */
  getListEntityIds(record, listName) {
    if (get(record, 'constructor.relationshipNames.belongsTo').includes(listName)) {
      const list = record.belongsTo(listName).value();
      let ids = list ? list.hasMany('list').ids() : null;
      return ids ? ids.map(gri => parseGri(gri).entityId) : ids;
    } else {
      return null;
    }
  },
});
