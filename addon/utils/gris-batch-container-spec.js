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
   * @param {OwsRequestPayload} message
   * @returns {boolean}
   */
  matches(message) {
    return message.operation === this.operation && this.gris.includes(message.gri);
  }
}
