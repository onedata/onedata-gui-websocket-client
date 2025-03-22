// FIXME: jsdoc

import { defer } from 'rsvp';
import AbstractBatchFlushStrategy from './abstract-batch-flush-strategy';

export default class ImmediateBatchFlushStrategy extends AbstractBatchFlushStrategy {
  /** @type {RSVP.Deferred} */
  executionDeferred = defer();

  /**
   * @override
   */
  scheduleFlush() {
    (async () => {
      const result = await this.container.execute();
      this.executionDeferred.resolve(result);
    })();
  }

  /**
   * @override
   */
  async waitForFlush() {
    return this.executionDeferred.promise;
  }
}
