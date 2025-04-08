/**
 * Executes batch after `debounceTime` after the schedule or last message added.
 *
 * If the message is added after schedule, the timer starts again.
 *
 * @author Jakub Liput
 * @copyright (C) 2025 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import { defer } from 'rsvp';
import AbstractBatchFlushStrategy from './abstract-batch-flush-strategy';

export default class DebouncedBatchFlushStrategy extends AbstractBatchFlushStrategy {
  constructor(container, options = {}) {
    super(container);
    this.debounceTime = options.debounceTime ?? 1;

    /** @type {number} */
    this.timeoutId;

    this.isFlushScheduled = false;
    this.executionDeferred = defer();
  }

  /**
   * @override
   */
  onMessageAdded() {
    if (this.isFlushScheduled) {
      this.resetTimer();
    }
  }

  /**
   * @override
   */
  async scheduleFlush() {
    this.isFlushScheduled = true;
    this.resetTimer();
  }

  async waitForFlush() {
    await this.executionDeferred.promise;
  }

  resetTimer() {
    clearTimeout(this.timeoutId);
    this.timeoutId = setTimeout(() => this.tryExecute(), this.debounceTime);
  }

  async tryExecute() {
    try {
      const result = await this.container.execute();
      this.executionDeferred.resolve(result);
    } catch (error) {
      this.executionDeferred.reject(error);
    }
  }
}
