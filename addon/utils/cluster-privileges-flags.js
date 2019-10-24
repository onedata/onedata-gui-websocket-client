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
    { name: 'cluster_view' },
    { name: 'cluster_update' },
    { name: 'cluster_delete' },
    { name: 'cluster_view_privileges' },
    { name: 'cluster_set_privileges' },
  ],
}, {
  groupName: 'userManagement',
  privileges: [
    { name: 'cluster_add_user' },
    { name: 'cluster_remove_user' },
  ],
}, {
  groupName: 'groupManagement',
  privileges: [
    { name: 'cluster_add_group' },
    { name: 'cluster_remove_group' },
  ],
}];

export default groupedFlags
  .map(group => group.privileges)
  .reduce((all, groupPerms) => all.concat(groupPerms.mapBy('name')), []);
