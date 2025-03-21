// FIXME: jsdoc

import Service, { inject as service } from '@ember/service';
import BatchRequestContainer from 'onedata-gui-websocket-client/utils/batch-request-container';

/**
 * @typedef {GrisBatchContainerSpec} BatchContainerSpec
 */

/**
 * @typedef {Object} BaseBatchContainerSpec
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
   * @returns {BatchRequestContainer}
   */
  createContainer(containerSpec) {
    const container = new BatchRequestContainer(containerSpec, this.onedataWebsocket);
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
}
