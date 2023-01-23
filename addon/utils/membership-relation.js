/**
 * Represents a relation between two records - parent and child.
 *
 * @module utils/membership-relation
 * @author Michal Borzecki
 * @copyright (C) 2018 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import EmberObject, {
  computed,
  observer,
  get,
  defineProperty,
} from '@ember/object';
import parseGri from 'onedata-gui-websocket-client/utils/parse-gri';
import { string } from 'ember-awesome-macros';

export default EmberObject.extend({
  /**
   * @virtual
   * @type {Group|Space}
   */
  parent: undefined,

  /**
   * @virtual
   * @type {User|Group}
   */
  child: undefined,

  /**
   * Is true if child is a currently logged in user
   * @type {boolean}
   */
  isChildCurrentUser: false,

  /**
   * If true, relation really exists. Created in listNamesObserver.
   * @type {Ember.ComputedProperty<boolean>}
   */
  exists: undefined,

  /**
   * TODO: VFS-7620 fix naming
   * @type {string}
   */
  // eslint-disable-next-line ember/no-string-prototype-extensions
  parentType: string.camelize('parent.constructor.modelName'),

  /**
   * @type {string}
   */
  // eslint-disable-next-line ember/no-string-prototype-extensions
  childType: string.camelize('child.constructor.modelName'),

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
      switch (parentType) {
        case 'group':
          return childType === 'group' ? 'parentList' : 'groupList';
        default:
          return `${parentType}List`;
      }
    }
  ),

  /**
   * @type {Ember.ComputedProperty<string>}
   */
  childListName: computed(
    'parentType',
    'childType',
    function childListName() {
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
  canViewPrivileges: computed(
    'exists',
    'isChildCurrentUser',
    'parent.canViewPrivileges',
    function canViewPrivileges() {
      const {
        exists,
        isChildCurrentUser,
        parent,
      } = this.getProperties('exists', 'isChildCurrentUser', 'parent');
      return exists && (isChildCurrentUser || get(parent, 'canViewPrivileges'));
    }
  ),

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
      defineProperty(this, 'exists', computed(
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
      // If we cannot get relation information, it is better to assume,
      // that the relation exists.
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
      return parentIds.includes(parentId) && childIds.includes(childId);
    } else if (parentIds) {
      return parentIds.includes(parentId);
    } else if (childIds) {
      return childIds.includes(childId);
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
      const listRecord = record.belongsTo(listName).value();
      const ids = listRecord ? listRecord.hasMany('list').ids() : null;
      return ids ? ids.map(gri => parseGri(gri).entityId) : ids;
    } else {
      return null;
    }
  },
});
