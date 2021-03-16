/**
 * Names of flags for workflow directory privileges.
 *
 * @module utils/workflow-directory-privileges-flags
 * @author Michał Borzęcki
 * @copyright (C) 2021 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

export const groupedFlags = [{
  groupName: 'directoryManagement',
  privileges: [
    { name: 'directory_view' },
    { name: 'directory_update' },
    { name: 'directory_delete' },
    { name: 'directory_view_privileges' },
    { name: 'directory_set_privileges' },
  ],
}, {
  groupName: 'userManagement',
  privileges: [
    { name: 'directory_add_user' },
    { name: 'directory_remove_user' },
  ],
}, {
  groupName: 'groupManagement',
  privileges: [
    { name: 'directory_add_group' },
    { name: 'directory_remove_group' },
  ],
}];

export default groupedFlags
  .map(group => group.privileges)
  .reduce((all, groupPerms) => all.concat(groupPerms.mapBy('name')), []);
