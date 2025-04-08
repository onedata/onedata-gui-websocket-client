/**
 * The container specification that matches request for multiple GRIs.
 *
 * For example, you can create a specification for fetching spaces records from list of
 * spaces while you know GRIs stored in SpaceList model before records fetch.
 *
 * @author Jakub Liput
 * @copyright (C) 2025 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import BatchContainerSpec from './batch-container-spec';

/**
 * @implements {BatchContainerSpec}
 */
export default class GrisBatchContainerSpec extends BatchContainerSpec {
  /**
   * @param {OwsGraphOperation}
   * @param {Array<string>} gris
   */
  constructor(operation, gris) {
    super(...arguments);
    if (!operation) {
      throw new Error(
        'GrisBatchContainerSpec.constructor: operation argument is mandatory'
      );
    }
    if (!Array.isArray(gris)) {
      throw new Error(
        'GrisBatchContainerSpec.constructor: gris argument should be an array'
      );
    }

    /** @type {OwsGraphOperation} */
    this.operation = operation;

    /** @type {Array<string>} */
    this.gris = gris;
  }

  /**
   * @override
   * @param {OwsRequestPayload} message
   * @returns {boolean}
   */
  matches(message) {
    return message.operation === this.operation && this.gris.includes(message.gri);
  }

  /**
   * @override
   * @param {BatchContainerSpec} otherSpec
   * @returns {boolean}
   */
  overlaps(otherSpec) {
    if (!(otherSpec instanceof GrisBatchContainerSpec)) {
      return false;
    }
    return this.operation === otherSpec.operation &&
      this.gris.find(gri => otherSpec.gris.includes(gri));
  }
}
