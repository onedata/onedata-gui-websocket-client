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
     * @type {Object<string, { message: Object, deferred: RSVP.Deferred }>}
     */
    this.messageDefers = {};

    this.state = State.Open;
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
      throw new Error('BatchRequestContainer: cannot addMessage in state:', this.state);
    }
    const message = this.wrapPayload(subtype, payload);
    const deferred = defer();
    this.messageDefers[message.id] = { message, deferred };
    return deferred.promise;
  }

  start() {
    this.setState(State.Open);
  }

  async flush() {
    this.setState(State.Sent);
    await this.execute();
  }

  async execute() {
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
