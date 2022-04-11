/**
 * Development implementation of `service:token-api` without usage of backend
 *
 * @module services/mocks/onedata-token-api
 * @author Jakub Liput
 * @copyright (C) 2017 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Service from '@ember/service';
import { resolve } from 'rsvp';

export default Service.extend({
  getInviteToken(inviterType, inviterEntityId, receiverType) {
    const randInt = Math.floor(Math.random() * 10000);
    return resolve(
      `token-${inviterType}-${inviterEntityId}-${receiverType}-${randInt}`
    );
  },
});
