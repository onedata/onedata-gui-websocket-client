/**
 * Names of flags for space privileges.
 * 
 * @module utils/space-privileges-flags
 * @author Michał Borzęcki
 * @copyright (C) 2018-2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import _ from 'lodash';

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
    { name: 'space_register_files' },
    { name: 'space_manage_shares' },
    { name: 'space_manage_datasets' },
    { name: 'space_view_views' },
    { name: 'space_manage_views' },
    { name: 'space_query_views' },
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
  groupName: 'qosManagement',
  privileges: [
    { name: 'space_view_qos' },
    { name: 'space_manage_qos' },
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
  groupName: 'supportManagement',
  privileges: [
    { name: 'space_add_support' },
    { name: 'space_remove_support' },
  ],
}, {
  groupName: 'harvesterManagement',
  privileges: [
    { name: 'space_add_harvester' },
    { name: 'space_remove_harvester' },
  ],
}, {
  groupName: 'archiveManagement',
  privileges: [
    { name: 'space_view_archives' },
    { name: 'space_create_archives' },
    { name: 'space_remove_archives' },
    { name: 'space_recall_archives' },
  ],
}];

export default _.flatten(
  groupedFlags.map(group => group.privileges.map(privilege => privilege.name))
);
