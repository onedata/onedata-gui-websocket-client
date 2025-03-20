import { expect } from 'chai';
import { describe, it } from 'mocha';
import BatchRequestContainer from 'onedata-gui-websocket-client/utils/batch-request-container';
import { v4 as uuid } from 'ember-uuid';
import gri from 'onedata-gui-websocket-client/utils/gri';
import { OwsGraphOperation } from 'onedata-gui-websocket-client/services/onedata-graph';
import _ from 'lodash';
import sinon from 'sinon';
import { OwsMessageSubtype, OwsMessageType } from 'onedata-gui-websocket-client/services/onedata-websocket';

/**
 * @implements {BaseBatchContainerSpec}
 */
class DummyContainerSpec {
  matches() {
    return true;
  }
}

class DummyOnedataWebsocket {
  /**
   * Mocks only batch message with Graph messages.
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

describe('Unit | Utility | batch-request-container', function () {
  it('can be instantiated', function () {
    // given
    const onedataWebsocket = new DummyOnedataWebsocket();
    const containerSpec = new DummyContainerSpec(
      new DummyContainerSpec(),
      new DummyOnedataWebsocket(),
    );

    // when
    const container = new BatchRequestContainer(containerSpec, onedataWebsocket);

    // then
    expect(container).to.be.ok;
  });

  it('uses onedataWebsocket.sendMessage to send batch message including wrapped payloads on manual flush',
    async function () {
      // given
      const onedataWebsocket = new DummyOnedataWebsocket();
      const sendMessageSpy = sinon.spy(onedataWebsocket, 'sendMessage');
      const containerSpec = new DummyContainerSpec(
        new DummyContainerSpec(),
        onedataWebsocket,
      );
      const container = new BatchRequestContainer(containerSpec, onedataWebsocket);
      const messages = _.times(3).map(() => Helper.generateDummyPayload());
      for (const message of messages) {
        container.addMessage(OwsMessageSubtype.Graph, message);
      }

      // when
      await container.flush();

      // then
      expect(sendMessageSpy).to.be.calledOnce;
      const spyCall = sendMessageSpy.getCalls()[0];
      const subtypeArg = spyCall.args[0];
      expect(subtypeArg).to.equal(OwsMessageSubtype.Batch);
      const payloadArg = spyCall.args[1];
      expect(payloadArg.batch).to.have.lengthOf(3);
      for (let i = 0; i < 3; ++i) {
        expect(payloadArg.batch[i]).to.have.property('type', OwsMessageType.Request);
        expect(payloadArg.batch[i]).to.have.property('subtype', OwsMessageSubtype.Graph);
        expect(payloadArg.batch[i]).to.have.property('payload');
        expect(payloadArg.batch[i].payload.gri).to.equal(messages[i].gri);
      }
    });
});

class Helper {
  static generateGri() {
    return gri({
      entityType: 'space',
      entityId: uuid(),
      aspect: 'instance',
    });
  }
  static generateDummyPayload() {
    return {
      gri: Helper.generateGri(),
      operation: OwsGraphOperation.Get,
    };
  }
}
