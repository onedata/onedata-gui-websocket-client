// FIXME: jsdoc

import { defer } from 'rsvp';
import {
  OwsMessageSubtype,
  wrapRequestPayload,
} from 'onedata-gui-websocket-client/services/onedata-websocket';
import config from 'ember-get-config';

/**
 * @enum {string}
 */
const State = Object.freeze({
  Open: 'open',
  Preparing: 'preparing',
  Sent: 'sent',
  Completed: 'completed',
});

// FIXME: można rozważyć zwracanie message z flusha

export default class BatchRequestContainer {
  /** @type {State} */
  #state;

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
     * Maps message ID (generated when the payload is wrapped) to pair of message object
     * and deferred that is resolved when this specific message gets resolved on batch
     * response.
     * @type {Object<string, { message: OwsMessage, deferred: RSVP.Deferred }>}
     */
    this.messageDefers;
    this.clearMessagesCache();
  }

  get state() {
    return this.#state;
  }

  set state(state) {
    if (
      this.state === State.Open && state === State.Preparing ||
      this.state === State.Preparing && state === State.Sent ||
      this.state === State.Sent && state === State.Completed ||
      (!this.state || this.state === State.Completed) && state === State.Open ||
      this.state === State.Preparing && state === State.Completed && !this.messagesCount
    ) {
      this.#state = state;
    } else {
      const message =
        `BatchRequestContainer.state: invalid state transition ${this.state} -> ${state}`;
      if (config.environment === 'production') {
        console.error(message);
      } else {
        throw new Error(message);
      }
    }
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
   * @type {number}
   */
  get messagesCount() {
    return Object.keys(this.messageDefers).length;
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

  /**
   * Schedules flush and waits for its completion. It is recommended to use separate calls
   * to `scheduleFlush` and `waitForFlush` instead to avoid potential deadlocks.
   * @return {Promise} Resolves when the registered messages are resolved from batch
   *   response.
   */
  async flush() {
    this.scheduleFlush();
    await this.waitForFlush();
  }

  /**
   * Schedules flush of batch message according to the injected strategy.
   * @returns {void}
   */
  scheduleFlush() {
    if (this.state === State.Open) {
      this.state = State.Preparing;
      this.flushStrategy.scheduleFlush();
    } else if (this.state !== State.Preparing) {
      throw new Error(
        `BatchRequestContainer.scheduleFlush: cannot scheduleFlush in state ${this.state}`
      );
    }
  }

  /**
   * Resolves when the registered messages are resolved from batch response accorging to the
   * injected strategy.
   * @returns {Promise<void>}
   */
  async waitForFlush() {
    await this.flushStrategy.waitForFlush();
  }

  /**
   * Creates single batch message consisting of all messages added using `addMessage`. Do
   * not use this method manually - instead use `scheduleFlush` or `flush`, which will
   * schedule the execution according to injected strategy. Use it in the stragegy
   * implementation.
   * @returns {Promise<OwsResponse|null>} Graph Sync batch response or null if there were
   *   no messages to send.
   */
  async execute() {
    if (!this.messagesCount) {
      this.state = State.Completed;
      return null;
    }

    if (this.state !== State.Preparing) {
      throw new Error(
        'BatchRequestContainer.execute: cannot execute not in preparing state'
      );
    }
    const batchPayload = this.createBatchPayload();
    this.state = State.Sent;
    // FIXME: obsługa błędu sendMessage - łapać błąd i resolvować wszystko oraz ustawiać odpowiedni stan
    // FIXME: napisać test takiego errora batcha
    /** @type {OwsResponse} */
    let batchResult;
    try {
      try {
        batchResult = await this.onedataWebsocket.sendMessage(
          OwsMessageSubtype.Batch, batchPayload
        );
        // FIXME: test errors and wrong responses
        for (const response of batchResult.payload.data.batch) {
          // FIXME: warning przed brakiem defera
          // FIXME: obsługa errora dla pojedynczych responsów (reject)
          // FIXME: napisać test do powyższego
          this.messageDefers[response.id]?.deferred.resolve(response);
          // FIXME: co jeśli zostają jakieś niezresolvovane message? reject?
        }
        return batchResult;
      } catch (error) {
        for (const { deferred } of Object.values(this.messageDefers)) {
          deferred.reject(error);
        }
        throw error;
      }
    } finally {
      this.state = State.Completed;
      this.clearMessagesCache();
    }
  }

  /**
   * Checks if the request payload should be added to this batch container.
   * @param {OwsRequestPayload} requestPayload
   * @returns {boolean}
   */
  matches(requestPayload) {
    return this.containerSpec.matches(requestPayload);
  }

  /**
   * @private
   * @returns {BatchOwsRequestPayload}
   */
  createBatchPayload() {
    const batch = Object.values(this.messageDefers).map(({ message }) => message);
    return { batch };
  }

  /**
   * @private
   * @param {OwsMessageSubtype}
   * @param {OwsGraphRequestPayload} payload
   * @returns {Object}
   */
  wrapPayload(subtype, payload) {
    return wrapRequestPayload(subtype, payload);
  }

  // FIXME: napisać test wielokrotnego użycia tego samego kontenera (np. schedulerem count)
  /**
   * @private
   */
  clearMessagesCache() {
    if (this.state && this.state !== State.Completed) {
      throw new Error(
        'BatchRequestContainer.clearMessageCache: cannot clear messages until flush completion'
      );
    }
    this.messageDefers = {};
    this.state = State.Open;
  }
}
