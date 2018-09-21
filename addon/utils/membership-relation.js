/**
 * Represents a relation between two records - parent and child.
 *
 * @module utils/membership-relation
 * @author Michal Borzecki
 * @copyright (C) 2018 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import EmberObject, { computed, observer, get, getProperties } from '@ember/object';
import { and } from '@ember/object/computed';
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
   * @type {Ember.ComputedProperty<string>}
   */
  parentListName: computed(
    'parent.entityType',
    'child.entityType',
    function parentListName() {
      const parentEntityType = this.get('parent.entityType');
      const childEntityType = this.get('child.entityType');
      if (parentEntityType === 'space') {
        return 'spaceList';
      } else if (childEntityType === 'group') {
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
    'parent.entityType',
    'child.entityType',
    function parentListName() {
      const parentEntityType = this.get('parent.entityType');
      const childEntityType = this.get('child.entityType');
      if (childEntityType === 'user') {
        return 'userList';
      } else if (parentEntityType === 'group') {
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
    } = this.getProperties('parent', 'child', 'parentListName', 'childListName');

    const {
      entityType: parentEntityType,
      entityId: parentId,
    } = getProperties(parent, 'entityType', 'entityId');
    const {
      entityType: childEntityType,
      entityId: childId,
    } = getProperties(child, 'entityType', 'entityId');

    if (parentEntityType === 'group' && childEntityType === 'group') {
      const hasParentViewPrivilege = get(parent, 'hasViewPrivilege');
      const hasChildViewPrivilege = get(child, 'hasViewPrivilege');
      // If we cannot get relation information, then we can't assume that
      // relation exists
      if (!hasChildViewPrivilege && !hasParentViewPrivilege) {
        return false;
      }
    }

    // We need to check both children and parents lists if possible, because
    // they can update separatedly and there may be a situation when one list does
    // not satisfy relation while the second one does it (because it
    // is outdated).
    const parentList = child.belongsTo(parentListName).value();
    const childList = parent.belongsTo(childListName).value();
    let parentIds = parentList ? parentList.hasMany('list').ids() : null;
    let childIds = childList ? childList.hasMany('list').ids() : null;

    if (parentIds) {
      parentIds = parentIds.map(gri => parseGri(gri).entityId);
    }
    if (childIds) {
      childIds = childIds.map(gri => parseGri(gri).entityId);
    }

    if (parentIds && childIds) {
      return parentIds.indexOf(parentId) !== -1 &&
        childIds.indexOf(childId) !== -1;
    } else if (parentIds) {
      return parentIds.indexOf(parentId) !== -1;
    } else if (childIds) {
      return childIds.indexOf(childId) !== -1;
    } else {
      return false;
    }
  },
});
