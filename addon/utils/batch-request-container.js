// FIXME: jsdoc

import { defer } from 'rsvp';
import {
  OwsMessageSubtype,
  wrapRequestPayload,
} from 'onedata-gui-websocket-client/services/onedata-websocket';

/**
 * @enum {string}
 */
const State = Object.freeze({
  Open: 'open',
  Preparing: 'preparing',
  Sent: 'sent',
});

// FIXME: można rozważyć zwracanie message z flusha

export default class BatchRequestContainer {
  /** @type {AbstractBatchFlushStrategy} */
  #flushStrategy;

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
     * @type {Object<string, { message: Object, deferred: RSVP.Deferred }>}
     */
    this.messageDefers = {};

    this.state = State.Open;
  }

  /** @type {AbstractBatchFlushStrategy} */
  get flushStrategy() {
    if (!this.#flushStrategy) {
      throw new Error('BatchRequestContainer: flushStrategy not set');
    }
    return this.#flushStrategy;
  }

  set flushStrategy(value) {
    this.#flushStrategy = value;
  }

  /**
   * Schedules sending message in batch.
   * @param {OwsMessageSubtype} subtype
   * @param {OwsRequestPayload} payload
   * @returns {Promise<OwsMessage>} The same result as when OnedataWebsocket.sendMessage
   *   for corresponding message could resolve.
   */
  addMessage(subtype, payload) {
    if (this.state === State.Sent) {
      throw new Error(`BatchRequestContainer: cannot addMessage in state: ${this.state}`);
    }
    const message = this.wrapPayload(subtype, payload);
    const deferred = defer();
    this.messageDefers[message.id] = { message, deferred };
    this.flushStrategy.onMessageAdded(subtype, payload);
    return deferred.promise;
  }

  start() {
    this.setState(State.Open);
  }

  // FIXME: raczej trzeba nazwać metodę scheduleFlush, bo strategia może wstrzymać
  // albo wrócić do koncepcji używania start - jeśli nie wrócę do tej konwencji, to usunąć
  // metodę start

  // FIXME: usunąć zastosowania?
  /**
   * @deprecated
   */
  async flush() {
    this.scheduleFlush();
    await this.waitForFlush();
  }

  scheduleFlush() {
    this.flushStrategy.scheduleFlush();
  }

  async waitForFlush() {
    await this.flushStrategy.waitForFlush();
  }

  async execute() {
    this.setState(State.Sent);
    const batchPayload = this.createBatchPayload();
    /** @type {OwsResponse} */
    const batchResult = await this.onedataWebsocket.sendMessage(
      OwsMessageSubtype.Batch, batchPayload
    );
    // FIXME: test errors and wrong responses
    for (const response of batchResult.payload.data.batch) {
      // FIXME: warning przed brakiem defera
      this.messageDefers[response.id]?.deferred.resolve(response);
    }
    this.setState(State.Open);
  }

  /**
   * @param {OwsRequestPayload} message
   * @returns {boolean}
   */
  matches(message) {
    return this.containerSpec.matches(message);
  }

  // FIXME: być może system stanów nie będzie tutaj potrzebny
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
   * @returns {BatchOwsRequestPayload}
   */
  createBatchPayload() {
    const batch = Object.values(this.messageDefers).map(({ message }) => message);
    return { batch };
  }

  // FIXME: wykorzystać metodę statyczną wyciągniętą z OnedataWebsocket

  /**
   * FIXME: currently supports only graph subtype
   * @private
   * @param {OwsMessageSubtype}
   * @param {OwsGraphRequestPayload} payload
   * @returns {Object}
   */
  wrapPayload(subtype, payload) {
    return wrapRequestPayload(subtype, payload);
  }
}
