/**
 * Names of flags for space privileges.
 * 
 * @module utils/space-privileges-flags
 * @author Michal Borzecki
 * @copyright (C) 2018-2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

export const groupedFlags = [{
  groupName: 'spaceManagement',
  privileges: [
    'space_view',
    'space_update',
    'space_delete',
    'space_view_privileges',
    'space_set_privileges',
  ],
}, {
  groupName: 'dataManagement',
  privileges: [
    'space_read_data',
    'space_write_data',
    'space_manage_shares',
    'space_view_views',
    'space_manage_views',
    'space_query_views',
    'space_view_statistics',
    'space_view_changes_stream',
  ],
}, {
  groupName: 'transferManagement',
  privileges: [
    'space_view_transfers',
    'space_schedule_replication',
    'space_cancel_replication',
    'space_schedule_eviction',
    'space_cancel_eviction',
  ],
}, {
  groupName: 'userManagement',
  privileges: [
    'space_add_user',
    'space_remove_user',
  ],
}, {
  groupName: 'groupManagement',
  privileges: [
    'space_add_group',
    'space_remove_group',
  ],
}, {
  groupName: 'providerManagement',
  privileges: [
    'space_add_provider',
    'space_remove_provider',
  ],
}, {
  groupName: 'harvesterManagement',
  privileges: [
    'space_add_harvester',
    'space_remove_harvester',
  ],
}];

export default groupedFlags
  .map(group => group.privileges)
  .reduce((all, groupPerms) => all.concat(groupPerms), []);
