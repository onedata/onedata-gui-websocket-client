// FIXME: jsdoc

/**
 * @implements {BaseBatchContainerSpec}
 */
export default class GrisBatchContainerSpec {
  /**
   * @param {OnedataGraphOperation}
   * @param {Array<string>} gris
   */
  constructor(operation, gris) {
    /** @type {OnedataGraphOperation} */
    this.operation = operation;

    /** @type {Array<string>} */
    this.gris = gris;
  }

  /**
   * @param {WebsocketMessage} message
   * @returns {boolean}
   */
  matches(message) {
    return message.operation === this.operation && this.gris.includes(message.gri);
  }
}
