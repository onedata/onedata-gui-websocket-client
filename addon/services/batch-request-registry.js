/**
 * Manages all BatchRequestContainers: creating, sharing them to requesting layers and
 * destroying.
 *
 * **Creating containers**: When we know in advance that N records will be fetched, and
 * their GRIs are already known, we can create a container with specification
 * (GrisBatchContainerSpec) that says every message matching that specification should be
 * done in single batch represented by single container.
 *
 * **Sharing containers in requesting layers**: When any of the request matching the
 * specification of the created container is tried to be executed in the lower layers of
 * application, instead of executing the request immediately, the requesting service
 * checks the registry. This service finds the registered matching container and the
 * request is added to that container. The container has code to flush gathered messages
 * as a single batch using appropriate requesting services when the time comes (see batch
 * containers flush strategies).
 *
 * **Destroying containers**: When we receive responses for the batched requests, the
 * container can be destroyed and deregistered from this registry.
 *
 * @author Jakub Liput
 * @copyright (C) 2025 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Service, { inject as service } from '@ember/service';
import BatchRequestContainer from 'onedata-gui-websocket-client/utils/batch-request-container';
import { ImmediateBatchFlushStrategy } from 'onedata-gui-websocket-client/utils/batch-flush-strategies';

/**
 * @typedef {GrisBatchContainerSpec} BatchContainerSpec
 */

/**
 * @typedef {Object} BatchContainerSpec
 * @property {(message: OwsRequestPayload) => boolean} matches Returns true if the message
 *   should be executed within this batch container.
 */

export default class BatchRequestRegistryService extends Service {
  @service onedataWebsocket;

  constructor() {
    super(...arguments);

    /**
     * @private
     * @type {Set<BatchRequestContainer>}
     */
    this.containers = new Set();
  }

  /**
   * @param {BatchContainerSpec} containerSpec
   * @param {typeof AbstractBatchFlushStrategy} [flushStrategyClass]
   * @param {Object} flushStrategyOptions
   * @returns {BatchRequestContainer}
   */
  createContainer(containerSpec, flushStrategyClass, flushStrategyOptions) {
    const conflictingContainer = this.findContainerMatchingSpec(containerSpec);
    if (conflictingContainer) {
      throw new ConflictSpecContainerError(containerSpec, conflictingContainer);
    }
    const container = new BatchRequestContainer(
      containerSpec,
      this.onedataWebsocket,
    );
    /** @type {AbstractBatchFlushStrategy} */
    const EffFlushStrategyClass = flushStrategyClass ?? ImmediateBatchFlushStrategy;
    container.flushStrategy = new EffFlushStrategyClass(container, flushStrategyOptions);
    this.containers.add(container);
    return container;
  }

  /**
   * @param {OwsRequestPayload} payload
   * @returns {BatchRequestContainer}
   */
  getContainer(payload) {
    for (const container of this.containers.values()) {
      if (container.matches(payload)) {
        return container;
      }
    }
    return null;
  }

  /**
   * @param {BatchRequestContainer} container
   * @returns {Promise<void>}
   */
  async destroyContainer(container) {
    this.containers.delete(container);
  }

  /**
   * @param {BatchContainerSpec} containerSpec
   * @returns {BatchRequestContainer|null}
   */
  findContainerMatchingSpec(containerSpec) {
    for (const container of this.containers.values()) {
      if (container.containerSpec.overlaps(containerSpec)) {
        return container;
      }
    }
    return null;
  }
}

export class ConflictSpecContainerError extends Error {
  /**
   * @param {BatchContainerSpec} containerSpec
   * @param {BatchRequestContainer} existingContainer
   */
  constructor(containerSpec, existingContainer) {
    super(
      'BatchRequestContainer matching some messages of the spec is already registered'
    );

    /** @type {BatchContainerSpec} */
    this.containerSpec = containerSpec;

    /** @type {BatchRequestContainer} */
    this.existingContainer = existingContainer;
  }
}
