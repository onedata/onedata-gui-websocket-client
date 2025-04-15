/**
 * Groups together requests that should be done as a single batch.
 *
 * Note, that BatchRequestContainers should be managed using BatchRequestRegistryService.
 * See its documentation for details.
 *
 * The BatchRequestContainer is used to gather requests according to provided
 * specification, which are eventually executed in single batch.
 *
 * **Creation:** The container is created with specification which requests it should
 * gather. See classes implementing BatchContainerSpec type. This is typically done when
 * we know what messages are going to be sent (eg. before fetching a list of spaces, when
 * we know all GRIs).
 *
 * **Requests gathering:** After the creation, the container accepts message payloads.
 * Messages are added typically by the requesting layer of the application (eg.
 * OnedataGraphService) based on the aformentioned requests specification.
 *
 * **Execution schedule:** The container has one of batch flush strategy, which defines
 * when the requests should be sent. For example, user can schedule flush and the strategy
 * says that the actual execution will be perfomed when there were be 300 messages added
 * to the container.
 *
 * **Execution:** When the flush is done, the container creates batch-type message and
 * uses the requesting layer to send it to the server. When the response is received, all
 * messages are resolved as they would be virtually separate messages - it is transparent
 * to user.
 *
 * @author Jakub Liput
 * @copyright (C) 2025 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import { defer } from 'rsvp';
import {
  OwsMessageSubtype,
  wrapRequestPayload,
} from 'onedata-gui-websocket-client/services/onedata-websocket';
import config from 'ember-get-config';
import { OwsMessageType } from '../services/onedata-websocket';

/**
 * @enum {string}
 */
const State = Object.freeze({
  Open: 'open',
  Preparing: 'preparing',
  Sent: 'sent',
  Completed: 'completed',
});

/**
 * @typedef {Object} BatchContainerMessageInfo
 * @property {OwsMessage} message
 * @property {RSVP.Deferred} deferred
 * @property {boolean} isResolved
 */

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
     * @type {Object<string, BatchContainerMessageInfo>}
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
    this.messageDefers[message.id] = { message, deferred, isResolved: false };
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
   * schedule the execution according to injected strategy. Use it in the strategy
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
    /** @type {OwsResponse} */
    let batchResult;
    try {
      try {
        batchResult = await this.onedataWebsocket.sendMessage(
          OwsMessageSubtype.Batch,
          batchPayload
        );
      } catch (error) {
        for (const { deferred } of Object.values(this.messageDefers)) {
          deferred.reject(error);
        }
        throw error;
      }
      for (const response of batchResult.payload.data.batch) {
        const messageDeferInfo = this.messageDefers[response.id];
        const deferred = messageDeferInfo?.deferred;
        if (deferred) {
          deferred.resolve(response);
          messageDeferInfo.isResolved = true;
        } else {
          this.handleNoResponseHandler(response);
        }
      }
      const notResolved = Object.values(this.messageDefers)
        .filter(({ isResolved }) => !isResolved);
      for (const { message, deferred } of notResolved) {
        deferred.resolve(this.noResponseInBatchErrorMessage(message));
      }
      return batchResult;
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
   * @returns {OwsBatchRequestPayload}
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

  /**
   * Special pseudo-response message indicating, that batch did not have the response for
   * the message (but it should have one).
   * @param {OwsRequest} requestMessage
   * @returns {OwsResponse}
   */
  noResponseInBatchErrorMessage(requestMessage) {
    return {
      id: requestMessage.id,
      type: OwsMessageType.Response,
      subtype: requestMessage.subtype,
      payload: {
        success: false,
        error: { id: 'noResponseInBatch' },
      },
    };
  }

  /**
   * @param {OwsResponse} response
   * @returns {void}
   */
  handleNoResponseHandler(response) {
    console.warn(
      `BatchRequestContainer.execute: no deferred registered for response: ${response.id}`,
      response
    );
  }
}
