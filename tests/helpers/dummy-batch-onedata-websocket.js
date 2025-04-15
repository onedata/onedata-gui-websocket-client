import { v4 as uuid } from 'ember-uuid';
import { OwsMessageSubtype, OwsMessageType } from 'onedata-gui-websocket-client/services/onedata-websocket';

export class DummyBatchOnedataWebsocket {
  /**
   * Mocks only batch message with Graph messages.
   * @override
   * @param {OwsMessageSubtype} subtype
   * @param {OwsRequestPayload} payload
   * @returns {Promise<OwsMessage>}
   */
  async sendMessage(subtype, payload) {
    const id = uuid();
    if (subtype !== OwsMessageSubtype.Batch || !payload.batch) {
      throw new Error('DummyOnedataWebsocket.sendMessage: only batch is mocked');
    }
    const responses = payload.batch.map(request => this.handleSingleMessage(request));
    return {
      id,
      type: OwsMessageType.Response,
      subtype: OwsMessageSubtype.Batch,
      payload: {
        success: true,
        error: null,
        data: {
          batch: responses,
        },
      },
    };
  }
  /**
   * Mocked sync response for Graph request.
   * @private
   * @param {OwsRequest} request
   * @returns {OwsResponse}
   */
  handleSingleMessage(request) {
    return {
      id: request.id,
      type: OwsMessageType.Response,
      subtype: OwsMessageSubtype.Graph,
      payload: {
        success: true,
        error: null,
        data: {
          resource: {
            gri: request.payload.gri,
          },
          format: 'resource',
        },
      },
    };
  }
}
