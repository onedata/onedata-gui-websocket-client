/** *
 * Development implementation of `service:onedata-websocket`.
 * Does nothing - only mocks initialized proxy.
 *
 * @module services/mocks/onedata-websocket
 * @author Jakub Liput
 * @copyright (C) 2017-2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Service from '@ember/service';
import { resolve } from 'rsvp';

export default Service.extend({
  webSocketInitializedProxy: resolve(),
  waitForConnectionClose() {
    return resolve();
  },
});
