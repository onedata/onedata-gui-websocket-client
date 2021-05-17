/**
 * Names of flags for automation inventory privileges.
 *
 * @module utils/atm-inventory-privileges-flags
 * @author Michał Borzęcki
 * @copyright (C) 2021 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

export const groupedFlags = [{
  groupName: 'inventoryManagement',
  privileges: [
    { name: 'atm_inventory_view' },
    { name: 'atm_inventory_update' },
    { name: 'atm_inventory_manage_lambdas' },
    { name: 'atm_inventory_delete' },
    { name: 'atm_inventory_view_privileges' },
    { name: 'atm_inventory_set_privileges' },
  ],
}, {
  groupName: 'userManagement',
  privileges: [
    { name: 'atm_inventory_add_user' },
    { name: 'atm_inventory_remove_user' },
  ],
}, {
  groupName: 'groupManagement',
  privileges: [
    { name: 'atm_inventory_add_group' },
    { name: 'atm_inventory_remove_group' },
  ],
}];

export default groupedFlags
  .map(group => group.privileges)
  .reduce((all, groupPerms) => all.concat(groupPerms.mapBy('name')), []);
