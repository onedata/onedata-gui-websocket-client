/**
 * A mocked abstraction layer for Onedata Sync API Websocket connection properties
 * For properties description see non-mocked `services/onedata-connection`
 *
 * @author Jakub Liput, Michał Borzęcki
 * @copyright (C) 2018 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Service from '@ember/service';

export default Service.extend({
  serviceVersion: '18.02.0-mock',
  globalTimeSecondsOffset: 0,
});
