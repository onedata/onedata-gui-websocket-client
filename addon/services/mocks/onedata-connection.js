/**
 * A mocked abstraction layer for Onedata Sync API Websocket connection properties 
 * For properties description see non-mocked `services/onedata-connection`
 *
 * @module services/mocks/onedata-connection
 * @author Jakub Liput, Michal Borzecki
 * @copyright (C) 2018 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Service, { inject } from '@ember/service';
import authorizersMock from 'onezone-gui/utils/authorizers-mock';

export default Service.extend({
  onedataWebsocket: inject(),

  zoneName: 'Hello world',
  serviceVersion: '18.02.0-mock',
  identityProviders: authorizersMock,
  brandSubtitle: 'Isolated zone',
  loginNotification: '',
});
