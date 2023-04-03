/**
 * Production implementation of `service:onedata-token-api`
 * Abstraction layer on getting tokens using Graph API
 *
 * @author Jakub Liput
 * @copyright (C) 2017-2018 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Service, { inject } from '@ember/service';
import gri from 'onedata-gui-websocket-client/utils/gri';

export default Service.extend({
  onedataGraph: inject(),

  getInviteToken(inviterType, inviterEntityId, receiverType) {
    let aspect;
    if (inviterType === 'space' &&  receiverType === 'provider') {
      aspect = 'space_support_token';
    } else {
      aspect = `invite_${receiverType}_token`;
    }
    return this.get('onedataGraph').request({
      gri: gri({
        entityType: inviterType,
        entityId: inviterEntityId,
        aspect,
      }),
      operation: 'create',
      subscribe: false,
    });
  },
});
