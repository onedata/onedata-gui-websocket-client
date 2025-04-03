/**
 * Executes batch if there are at least `requiredMessagesNumber` messages in the
 * container.
 *
 * @author Jakub Liput
 * @copyright (C) 2025 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import { defer } from 'rsvp';
import AbstractBatchFlushStrategy from './abstract-batch-flush-strategy';

export default class CountBatchFlushStrategy extends AbstractBatchFlushStrategy {
  constructor(container, options = {}) {
    super(container);

    /** @type {number} */
    this.requiredMessagesNumber = options.requiredMessagesNumber ?? 1;

    /** @type {number} */
    this.count = 0;

    /** @type {boolean} */
    this.isFlushScheduled = false;

    /** @type {RSVP.Deferred} */
    this.executorDeferred = defer();
  }

  /**
   * @override
   */
  onMessageAdded() {
    this.incrementCounter();
    if (this.isFlushScheduled) {
      this.tryExecute();
    }
  }

  /**
   * @override
   */
  async scheduleFlush() {
    this.isFlushScheduled = true;
    this.tryExecute();
  }

  async waitForFlush() {
    await this.executorDeferred.promise;
  }

  isRequiredCount() {
    return this.count >= this.requiredMessagesNumber;
  }

  incrementCounter() {
    this.count += 1;
  }

  async tryExecute() {
    if (this.isRequiredCount()) {
      const result = await this.container.execute();
      this.executorDeferred.resolve(result);
    }
  }
}
