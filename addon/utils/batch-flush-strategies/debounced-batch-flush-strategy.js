// FIXME: jsdoc

import { defer } from 'rsvp';
import AbstractBatchFlushStrategy from './abstract-batch-flush-strategy';

export default class DebouncedBatchFlushStrategy extends AbstractBatchFlushStrategy {
  constructor(container, options = {}) {
    super(container);
    this.debounceTime = options.debounceTime ?? 1;

    /** @type {number} */
    this.timeoutId;

    this.isFlushScheduled = false;
    this.executorDeferred = defer();
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
   * FIXME: Czekamy n ms po każdym następnym onMessageAdd i wykonujemy execute.
   * @override
   */
  async scheduleFlush() {
    this.isFlushScheduled = true;
    this.resetTimer();
  }

  async waitForFlush() {
    await this.executorDeferred.promise;
  }

  resetTimer() {
    clearTimeout(this.timeoutId);
    this.timeoutId = setTimeout(async () => {
      const result = await this.container.execute();
      this.executorDeferred.resolve(result);
    }, this.debounceTime);
  }
}
