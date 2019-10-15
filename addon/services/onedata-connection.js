/**
 * An abstraction layer for Onedata Sync API Websocket connection properties 
 *
 * @module services/onedata-connection
 * @author Jakub Liput, Michał Borzęcki
 * @copyright (C) 2018-2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import { reads } from '@ember/object/computed';
import Service, { inject as service } from '@ember/service';

export default Service.extend({
  onedataWebsocket: service(),

  /**
   * @type {Ember.ComputedProperty<Object>}
   */
  attributes: reads('onedataWebsocket.connectionAttributes'),

  /**
   * @type {Ember.ComputedProperty<string>}
   */
  serviceVersion: reads('attributes.serviceVersion'),

  /**
   * @type {Ember.ComputedProperty<string>}
   */
  serviceBuildVersion: reads('attributes.serviceBuildVersion'),
});
