/**
 * Provides `waitForPendingFindRequests` method for asynchronously waiting for find
 * requests to be settled.
 *
 * @author Jakub Liput
 * @copyright (C) 2024 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Mixin from '@ember/object/mixin';
import { defer } from 'rsvp';

export default Mixin.create({
  /**
   * Maps GRI -> number of pending find requests for that GRI.
   * @type {Object<string, number>}
   */
  currentGriFindRequests: undefined,

  /**
   * Deferred for notifying async. that all pending find requests have been finished.
   * @type {RSVP.Defer}
   */
  allFindRequestsDeferred: undefined,

  init() {
    this.set('currentGriFindRequests', {});
    this._super(...arguments);
  },

  /**
   * @override
   */
  async findRecord(store, type, id, /* snapshot */ ) {
    try {
      if (!Object.keys(this.currentGriFindRequests).length) {
        this.set('allFindRequestsDeferred', defer());
      }
      if (!this.currentGriFindRequests[id]) {
        this.currentGriFindRequests[id] = 0;
      }
      this.currentGriFindRequests[id] += 1;

      return await this._super(...arguments);
    } finally {
      this.currentGriFindRequests[id] -= 1;
      if (!this.currentGriFindRequests[id]) {
        delete this.currentGriFindRequests[id];
      }
      if (!Object.keys(this.currentGriFindRequests).length) {
        this.allFindRequestsDeferred.resolve();
      }
    }
  },

  /**
   * Asynchronously waits for all started, but not finished get requests to be done.
   * @return {Promise<void>}
   */
  async waitForPendingFindRequests() {
    await this.allFindRequestsDeferred?.promise;
  },
});
