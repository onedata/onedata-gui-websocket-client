/**
 * Names of flags for cluster privileges.
 * 
 * @module utils/cluster-privileges-flags
 * @author Michał Borzęcki
 * @copyright (C) 2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

export const groupedFlags = [{
  groupName: 'clusterManagement',
  privileges: [
    'cluster_view',
    'cluster_update',
    'cluster_delete',
    'cluster_view_privileges',
    'cluster_set_privileges',
  ],
}, {
  groupName: 'userManagement',
  privileges: [
    'cluster_add_user',
    'cluster_remove_user',
  ],
}, {
  groupName: 'groupManagement',
  privileges: [
    'cluster_add_group',
    'cluster_remove_group',
  ],
}];

export default groupedFlags
  .map(group => group.privileges)
  .reduce((all, groupPerms) => all.concat(groupPerms), []);
