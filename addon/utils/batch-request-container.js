// FIXME: jsdoc

import { defer } from 'rsvp';

/**
 * @enum {string}
 */
const State = Object.freeze({
  Open: 'open',
  Preparing: 'preparing',
  Sent: 'sent',
});

export default class BatchRequestContainer {
  /**
   * @param {BatchContainerSpec} batchContainerSpec
   * @param {Service.OnedataWebsocket} onedataWebsocket
   */
  constructor(containerSpec, onedataWebsocket) {
    /** @type {BatchContainerSpec} */
    this.containerSpec = containerSpec;

    /** @type {Service.OnedataWebsocket} */
    this.onedataWebsocket = onedataWebsocket;

    /**
     * @type {Map<WebsocketMessage, RSVP.Deferred>}
     */
    this.messageDefers = new Map();

    this.state = State.Open;
  }

  /**
   * @param {WebsocketMessage} message
   * @returns {void}
   */
  addMessage(message) {
    if (this.state === State.Sent) {
      throw new Error('BatchRequestContainer: cannot addMessage in state:', this.state);
    }
    this.messageDefers.set(message, defer());
  }

  start() {
    this.setState(State.Open);
  }

  async flush() {
    this.setState(State.Sent);
    await this.execute();
  }

  async execute() {
    const batchMessage = this.createBatchMessage();
    const result = await this.onedataWebsocket.sendMessage(batchMessage);
    this.setState(State.Open);
  }

  /**
   * @param {WebsocketMessage} message
   * @returns {boolean}
   */
  matches(message) {
    return this.containerSpec.matches(message);
  }

  /**
   * @private
   * @param {State} state
   * @returns {void}
   */
  setState(state) {
    this.state = state;
  }

  /**
   * @private
   * @returns {BatchWebsocketMessage}
   */
  createBatchMessage() {
    return {
      batch: [
        ...this.messageDefers.keys(),
      ],
    };
  }
}
