/**
 * An abstraction layer for Onedata Sync API Websocket connection properties 
 *
 * @module services/onedata-connection
 * @author Jakub Liput, Michal Borzecki
 * @copyright (C) 2018 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import { reads } from '@ember/object/computed';

import Service, { inject } from '@ember/service';

export default Service.extend({
  onedataWebsocket: inject(),

  attributes: reads('onedataWebsocket.connectionAttributes'),

  /**
   * Name of zone instance - available only in Onezone!
   * @type {Ember.Computed<string>}
   */
  zoneName: reads('attributes.zoneName'),

  /**
   * Domain name of Onezone - available only in Onezone!
   * @type {Ember.ComputedProperty<string>}
   */
  zoneDomain: reads('attributes.zoneDomain'),

  /**
   * @type {Ember.ComputedProperty<string>}
   */
  serviceVersion: reads('attributes.serviceVersion'),

  /**
   * @type {Ember.ComputedProperty<string>}
   */
  serviceBuildVersion: reads('attributes.serviceBuildVersion'),

  /**
   * @type {Ember.Computed<string>}
   */
  brandSubtitle: reads('attributes.brandSubtitle'),
});
