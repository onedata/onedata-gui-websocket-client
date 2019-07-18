/**
 * Names of flags for space privileges.
 * 
 * @module utils/space-privileges-flags
 * @author Michał Borzęcki
 * @copyright (C) 2018-2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

export const groupedFlags = [{
  groupName: 'spaceManagement',
  privileges: [
    { name: 'space_view' },
    { name: 'space_update' },
    { name: 'space_delete' },
    { name: 'space_view_privileges' },
    { name: 'space_set_privileges' },
  ],
}, {
  groupName: 'dataManagement',
  privileges: [
    { name: 'space_read_data' },
    { name: 'space_write_data' },
    { name: 'space_manage_shares' },
    { name: 'space_view_indices' },
    { name: 'space_manage_indices' },
    { name: 'space_query_indices' },
    { name: 'space_view_statistics' },
    { name: 'space_view_changes_stream' },
  ],
}, {
  groupName: 'transferManagement',
  privileges: [
    { name: 'space_view_transfers' },
    { name: 'space_schedule_replication' },
    { name: 'space_cancel_replication' },
    { name: 'space_schedule_eviction' },
    { name: 'space_cancel_eviction' },
  ],
}, {
  groupName: 'userManagement',
  privileges: [
    { name: 'space_add_user' },
    { name: 'space_remove_user' },
  ],
}, {
  groupName: 'groupManagement',
  privileges: [
    { name: 'space_add_group' },
    { name: 'space_remove_group' },
  ],
}, {
  groupName: 'providerManagement',
  privileges: [
    { name: 'space_add_provider' },
    { name: 'space_remove_provider' },
  ],
}];

export default groupedFlags
  .map(group => group.privileges)
  .reduce((all, groupPerms) => all.concat(groupPerms.mapBy('name')), []);
