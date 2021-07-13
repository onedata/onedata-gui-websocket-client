/**
 * Names of flags for group privileges.
 *
 * @module utils/group-privileges-flags
 * @author Michał Borzęcki
 * @copyright (C) 2018-2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

export const groupedFlags = [{
  groupName: 'groupManagement',
  privileges: [
    { name: 'group_view' },
    { name: 'group_update' },
    { name: 'group_view_privileges' },
    { name: 'group_set_privileges' },
    { name: 'group_delete' },
  ],
}, {
  groupName: 'groupHierarchyManagement',
  privileges: [
    { name: 'group_add_child' },
    { name: 'group_remove_child' },
    { name: 'group_add_parent' },
    { name: 'group_leave_parent' },
  ],
}, {
  groupName: 'userManagement',
  privileges: [
    { name: 'group_add_user' },
    { name: 'group_remove_user' },
  ],
}, {
  groupName: 'spaceManagement',
  privileges: [
    { name: 'group_add_space' },
    { name: 'group_leave_space' },
  ],
}, {
  groupName: 'handleManagement',
  privileges: [
    { name: 'group_create_handle' },
    { name: 'group_leave_handle' },
    { name: 'group_create_handle_service' },
    { name: 'group_leave_handle_service' },
  ],
}, {
  groupName: 'clusterManagement',
  privileges: [
    { name: 'group_add_cluster' },
    { name: 'group_leave_cluster' },
  ],
}, {
  groupName: 'harvesterManagement',
  privileges: [
    { name: 'group_add_harvester' },
    { name: 'group_remove_harvester' },
  ],
}, {
  groupName: 'inventoryManagement',
  privileges: [
    { name: 'group_add_atm_inventory' },
    { name: 'group_remove_atm_inventory' },
  ],
}];

export default groupedFlags
  .map(group => group.privileges)
  .reduce((all, groupPerms) => all.concat(groupPerms.mapBy('name')), []);
