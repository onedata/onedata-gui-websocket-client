/**
 * Additional util functions related to onedata-graph
 *
 * @author Michał Borzęcki
 * @copyright (C) 2018 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Service, { inject as service } from '@ember/service';
import gri from 'onedata-gui-websocket-client/utils/gri';

export default Service.extend({
  onedataGraph: service(),

  /**
   * Creates a relation between record specified by invitation token
   * and record specified by authHint
   * @param {string} entityType Entity type of record specified by token
   * @param {string} token invitation token
   * @param {[string, string]} authHint
   * @returns {Promise}
   */
  joinRelation(entityType, token, authHint) {
    return this.get('onedataGraph').request({
      gri: gri({
        entityType,
        aspect: 'join',
        scope: 'private',
      }),
      operation: 'create',
      data: {
        token,
      },
      authHint,
      subscribe: false,
    });
  },

  /**
   * Deletes a relation between two records
   * @param {string} entityType
   * @param {string} entityId
   * @param {string} aspect
   * @param {string} aspectId
   * @returns {Promise}
   */
  leaveRelation(entityType, entityId, aspect, aspectId) {
    return this.get('onedataGraph').request({
      gri: gri({
        entityType,
        entityId,
        aspect,
        aspectId,
        scope: 'private',
      }),
      operation: 'delete',
      subscribe: false,
    });
  },

  /**
   * Adds a new owner to the specified record
   * @param {String} beingOwnedEntityType entity type of a record, which will have a new owner
   * @param {String} beingOwnedEntityId entity id of a record, which will have a new owner
   * @param {String} ownerEntityId new owner (user) entity id
   * @returns {Promise}
   */
  addOwner(beingOwnedEntityType, beingOwnedEntityId, ownerEntityId) {
    return this.get('onedataGraph').request({
      gri: gri({
        entityType: beingOwnedEntityType,
        entityId: beingOwnedEntityId,
        aspect: 'owner',
        aspectId: ownerEntityId,
        scope: 'private',
      }),
      operation: 'create',
      subscribe: false,
    });
  },

  /**
   * Removes an owner from the specified record
   * @param {String} beingOwnedEntityType entity type of a record, from which the owner will be removed
   * @param {String} beingOwnedEntityId entity id of a record, from which the owner will be removed
   * @param {String} ownerEntityId new owner (user) entity id
   * @returns {Promise}
   */
  removeOwner(beingOwnedEntityType, beingOwnedEntityId, ownerEntityId) {
    return this.leaveRelation(
      beingOwnedEntityType,
      beingOwnedEntityId,
      'owner',
      ownerEntityId
    );
  },
});
