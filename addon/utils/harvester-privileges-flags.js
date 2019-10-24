/**
 * Names of flags for harvester privileges.
 * 
 * @module utils/harvester-privileges-flags
 * @author Michał Borzęcki
 * @copyright (C) 2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

export const groupedFlags = [{
  groupName: 'harvesterManagement',
  privileges: [
    { name: 'harvester_view' },
    { name: 'harvester_update' },
    { name: 'harvester_delete' },
    { name: 'harvester_view_privileges' },
    { name: 'harvester_set_privileges' },
  ],
}, {
  groupName: 'userManagement',
  privileges: [
    { name: 'harvester_add_user' },
    { name: 'harvester_remove_user' },
  ],
}, {
  groupName: 'groupManagement',
  privileges: [
    { name: 'harvester_add_group' },
    { name: 'harvester_remove_group' },
  ],
}, {
  groupName: 'spaceManagement',
  privileges: [
    { name: 'harvester_add_space' },
    { name: 'harvester_remove_space' },
  ],
}];

export default groupedFlags
  .map(group => group.privileges)
  .reduce((all, groupPerms) => all.concat(groupPerms.mapBy('name')), []);
