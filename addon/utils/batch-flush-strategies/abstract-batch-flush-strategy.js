/**
 * Interface for flush strategy classes.
 *
 * The flush strategy implements the scheduler for batch request execution (flush) in the
 * BatchRequestContainer. User of BatchRequestContainer invokes `scheduleFlush` method
 * which changes its state to "Preparing" - from this time, the scheduler from this
 * strategy must decide when the batch execution should occur.
 *
 * New messages can be added to the container between `scheduleFlush` and execution. The
 * strategy have optional `onMessageAdded` callback that can be used to handle messages
 * added after schedule (eg. we want to wait for N messages in the container until it is
 * flushed). User can wait between schedule and execution (flush) using the `waitForFlush`
 * method.
 *
 * @author Jakub Liput
 * @copyright (C) 2025 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

export default class AbstractBatchFlushStrategy {
  /**
   * @param {BatchRequestContainer} container
   */
  constructor(container) {
    /** @type {BatchRequestContainer} */
    this.container = container;
  }

  /**
   * Callback called after the payload is added as a message to the batch container.
   * @virtual optional
   * @param {OwsMessageSubtype} subtype
   * @param {OwsRequestPayload} payload
   */
  onMessageAdded() {}

  /**
   * @virtual
   * @returns {void}
   */
  scheduleFlush() {
    throw new Error('AbstractBatchFlushStrategy: scheduleFlush not implemented');
  }

  /**
   * @virtual
   * @returns {Promise<void>}
   */
  async waitForFlush() {
    throw new Error('AbstractBatchFlushStrategy: waitForFlush not implemented');
  }
}
