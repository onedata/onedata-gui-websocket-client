/**
 * Abstract base definition for BatchContainerSpecs.
 *
 * The spec defines which messages should be added to a single BatchContainer.
 *
 * @author Jakub Liput
 * @copyright (C) 2025 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

export default class BatchContainerSpec {
  /**
   * @param {OwsGraphOperation}
   * @param {Array<string>} gris
   */
  constructor( /* operation, gris */ ) {}

  /**
   * Returns true if the message should be executed within this batch container.
   * @virtual
   * @param {OwsRequestPayload} message
   * @returns {boolean}
   */
  matches( /* message */ ) {
    return false;
  }

  /**
   * Returns true if this container would match at least single message matched by
   * `otherSpec`.
   * @virtual
   * @param {BatchContainerSpec} otherSpec
   * @returns {boolean}
   */
  overlaps( /* otherSpec */ ) {
    return false;
  }
}
