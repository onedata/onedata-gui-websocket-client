// FIXME: jsdoc

// FIXME: test: cannot instantiate abstract
export default class AbstractBatchFlushStrategy {
  /**
   * @param {BatchRequestContainer} container
   */
  constructor(container) {
    /** @type {BatchRequestContainer} */
    this.container = container;
  }

  onMessageAdded() {}

  scheduleFlush() {
    throw new Error('AbstractBatchFlushStrategy: scheduleFlush not implemented');
  }

  async waitForFlush() {
    throw new Error('AbstractBatchFlushStrategy: waitForFlush not implemented');
  }
}
