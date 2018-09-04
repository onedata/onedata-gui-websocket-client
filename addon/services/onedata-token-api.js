/**
 * Production implementation of `service:onedata-token-api`
 * Abstraction layer on getting tokens using Graph API
 *
 * @module services/onedata-token-api
 * @author Jakub Liput
 * @copyright (C) 2017-2018 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Service, { inject } from '@ember/service';
import gri from 'onedata-gui-websocket-client/utils/gri';

export default Service.extend({
  onedataGraph: inject(),

  getInviteToken(inviterType, inviterEntityId, receiverType) {
    return this.get('onedataGraph').request({
      gri: gri({
        entityType: inviterType,
        entityId: inviterEntityId,
        aspect: `invite_${receiverType}_token`,
      }),
      operation: 'create',
      subscribe: false,
    }).then(({ data }) => data);
  },
});
