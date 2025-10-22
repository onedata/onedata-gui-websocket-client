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
 * @copyright (C) 2025 Onedata (onedata.org)
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Service, { inject as service } from '@ember/service';
import BatchRequestContainer from 'onedata-gui-websocket-client/utils/batch-request-container';
import { ImmediateBatchFlushStrategy } from 'onedata-gui-websocket-client/utils/batch-flush-strategies';
import { defer } from 'rsvp';
import { Mutex } from 'async-mutex';

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

  /**
   * Store defers to wait for container to be destroyed and removed from the registry.
   * It is used by `waitForContainerDestroy`.
   * @type {Map<BatchRequestContainer, Deferred>}
   */
  #containerDestroyDefers = new Map();

  /**
   * Guards against creating batch containers with conflicts. See docs in
   * `createContainer` for more information.
   * @type {Mutex}
   */
  #creationMutex = new Mutex();

  /**
   * @protected
   * @type {Set<BatchRequestContainer>}
   */
  containers = new Set();

  /**
   * Safely create new batch container using the spec, without conflicts with other
   * containers. The asynchronicity is used to wait for conflicts to be ended.
   *
   * @param {BatchContainerSpec} containerSpec
   * @param {typeof AbstractBatchFlushStrategy} [flushStrategyClass]
   * @param {Object} flushStrategyOptions
   * @returns {Promise<BatchRequestContainer>}
   */
  async createContainer(containerSpec, flushStrategyClass, flushStrategyOptions) {
    /*
     * This method uses single mutex in two areas:
     * - finding conflicting containers (ones that overlaps specs),
     * - creating the actual container.
     *
     * This is because we should not create a container that overlaps spec of another
     * container. Before creating the container based on specs, we check all other
     * registered container against overlapping specs. If we found one, we must wait for
     * it to be destroyed, which is an async function. When it is destroyed, we want to
     * create the container, but there can be more that one container waiting to be
     * created. The problem is, that these multiple containers can have overlapping specs,
     * but they are not registered yet, so our check for conflicts will not detect them
     * until they are fully registered. The mutex guards against "simultaneous"
     * registering new container and searching for conflicts.
     */

    /**
     * We should release global mutex only if we acquired it before in this method.
     * @type {boolean}
     */
    let isAcquiredLocally = false;
    const acquire = async () => {
      await this.#creationMutex.acquire();
      isAcquiredLocally = true;
    };
    const release = async () => {
      if (isAcquiredLocally) {
        this.#creationMutex.release();
        isAcquiredLocally = false;
      }
    };

    try {
      let noConflictFound = false;
      await acquire();
      while (!noConflictFound) {
        const conflictingContainer = this.findContainerMatchingSpec(containerSpec);
        if (conflictingContainer) {
          // Do not globally lock this method when we wait for conflicting container to be
          // destroyed, because the method could be used simultaneously for creating
          // non-conflicting container.
          release();
          await this.waitForContainerDestroy(conflictingContainer);
          await acquire();
        } else {
          noConflictFound = true;
        }
      }

      const container = new BatchRequestContainer(
        containerSpec,
        this.onedataWebsocket,
      );
      /** @type {AbstractBatchFlushStrategy} */
      const EffFlushStrategyClass = flushStrategyClass ?? ImmediateBatchFlushStrategy;
      container.flushStrategy =
        new EffFlushStrategyClass(container, flushStrategyOptions);
      this.containers.add(container);
      return container;
    } finally {
      release();
    }
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
   * @returns {void}
   */
  destroyContainer(container) {
    this.containers.delete(container);
    this.#containerDestroyDefers.get(container)?.resolve();
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

  /**
   * Wait for the container to not exists in the registry - either it could not exists at
   * all when invoking the method or it can be registered and you want to wait for it to
   * be destroyed.
   * @param {BatchRequestContainer} container
   * @returns {Promise<void>}
   */
  async waitForContainerDestroy(container) {
    if (!this.containers.has(container)) {
      return;
    }
    if (!this.#containerDestroyDefers.has(container)) {
      this.#containerDestroyDefers.set(container, defer());
    }
    await this.#containerDestroyDefers.get(container).promise;
    this.#containerDestroyDefers.delete(container);
  }

  /**
   * @param {BatchRequestContainer} container
   */
  async flushAndDestroy(container) {
    try {
      await container.flush();
    } finally {
      this.destroyContainer(container);
    }
  }
}
