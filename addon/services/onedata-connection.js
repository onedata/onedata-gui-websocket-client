/**
 * An abstraction layer for Onedata Sync API Websocket connection properties
 *
 * Instance of onedata-connection service should be created before handshake,
 * because `globalTimeSecondsOffset` property should be calculated at the
 * the exact time of handshake occurence (it's calculation needs
 * current timestamp).
 *
 * @author Jakub Liput, Michał Borzęcki
 * @copyright (C) 2018-2022 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import { observer } from '@ember/object';
import { reads } from '@ember/object/computed';
import Service, { inject as service } from '@ember/service';

export default Service.extend({
  onedataWebsocket: service(),

  /**
   * Difference between global (backend) time and local browser time.
   * If > 0 then backend has "bigger" time.
   * @type {ComputedProperty<number>}
   */
  globalTimeSecondsOffset: undefined,

  /**
   * @type {ComputedProperty<Object>}
   */
  attributes: reads('onedataWebsocket.connectionAttributes'),

  /**
   * @type {ComputedProperty<string>}
   */
  serviceVersion: reads('attributes.serviceVersion'),

  /**
   * @type {ComputedProperty<string>}
   */
  serviceBuildVersion: reads('attributes.serviceBuildVersion'),

  /**
   * Backend "now" timestamp during the WS handshake.
   * @type {ComputedProperty<number>}
   */
  globalTimeSeconds: reads('attributes.globalTimeSeconds'),

  globalTimeSecondsObserver: observer(
    'globalTimeSeconds',
    function globalTimeSecondsObserver() {
      const nowTimestamp = Math.floor(Date.now() / 1000);
      const globalTimeSeconds = this.get('globalTimeSeconds') || nowTimestamp;

      this.set('globalTimeSecondsOffset', globalTimeSeconds - nowTimestamp);
    }
  ),

  init() {
    this._super(...arguments);

    this.globalTimeSecondsObserver();
  },
});
