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
    'harvester_view',
    'harvester_update',
    'harvester_delete',
    'harvester_view_privileges',
    'harvester_set_privileges',
  ],
}, {
  groupName: 'userManagement',
  privileges: [
    'harvester_add_user',
    'harvester_remove_user',
  ],
}, {
  groupName: 'groupManagement',
  privileges: [
    'harvester_add_group',
    'harvester_remove_group',
  ],
}, {
  groupName: 'spaceManagement',
  privileges: [
    'harvester_add_space',
    'harvester_remove_space',
  ],
}];

export default groupedFlags
  .map(group => group.privileges)
  .reduce((all, groupPerms) => all.concat(groupPerms), []);
