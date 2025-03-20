// FIXME: jsdoc

/**
 * @implements {BaseBatchContainerSpec}
 */
export default class GrisBatchContainerSpec {
  /**
   * @param {OwsGraphOperation}
   * @param {Array<string>} gris
   */
  constructor(operation, gris) {
    /** @type {OwsGraphOperation} */
    this.operation = operation;

    /** @type {Array<string>} */
    this.gris = gris;
  }

  /**
   * @param {OwsRequestPayload} message
   * @returns {boolean}
   */
  matches(message) {
    return message.operation === this.operation && this.gris.includes(message.gri);
  }
}
