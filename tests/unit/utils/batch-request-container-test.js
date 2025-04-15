import { expect } from 'chai';
import { describe, it } from 'mocha';
import BatchRequestContainer from 'onedata-gui-websocket-client/utils/batch-request-container';
import { v4 as uuid } from 'ember-uuid';
import gri from 'onedata-gui-websocket-client/utils/gri';
import { OwsGraphOperation } from 'onedata-gui-websocket-client/services/onedata-graph';
import _ from 'lodash';
import sinon from 'sinon';
import { OwsMessageSubtype, OwsMessageType } from 'onedata-gui-websocket-client/services/onedata-websocket';
import { registerService, lookupService } from '../../helpers/stub-service';
import { DummyBatchOnedataWebsocket } from '../../helpers/dummy-batch-onedata-websocket';
import {
  ImmediateBatchFlushStrategy,
  CountBatchFlushStrategy,
} from 'onedata-gui-websocket-client/utils/batch-flush-strategies';
import BatchContainerSpec from 'onedata-gui-websocket-client/utils/batch-container-spec';

/**
 * @implements {BatchContainerSpec}
 */
class DummyContainerSpec extends BatchContainerSpec {
  matches() {
    return true;
  }
}

describe('Unit | Utility | batch-request-container', function () {
  it('can be instantiated', function () {
    // given
    const onedataWebsocket = new DummyBatchOnedataWebsocket();
    const containerSpec = new DummyContainerSpec(
      new DummyContainerSpec(),
      onedataWebsocket
    );

    // when
    const container = new BatchRequestContainer(containerSpec, onedataWebsocket);

    // then
    expect(container).to.be.ok;
  });

  it('uses onedataWebsocket.sendMessage to send batch message including wrapped payloads on manual flush',
    async function () {
      // given
      const onedataWebsocket = new DummyBatchOnedataWebsocket();
      const sendMessageSpy = sinon.spy(onedataWebsocket, 'sendMessage');
      const containerSpec = new DummyContainerSpec(
        new DummyContainerSpec(),
        onedataWebsocket,
      );
      const container = new BatchRequestContainer(containerSpec, onedataWebsocket);
      container.flushStrategy = new ImmediateBatchFlushStrategy(container);
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
    }
  );

  it('can be reused after resolving batch response', async function () {
    // given
    const onedataWebsocket = new DummyBatchOnedataWebsocket();
    const sendMessageSpy = sinon.spy(onedataWebsocket, 'sendMessage');
    const containerSpec = new DummyContainerSpec(
      new DummyContainerSpec(),
      onedataWebsocket,
    );
    const container = new BatchRequestContainer(containerSpec, onedataWebsocket);
    container.flushStrategy = new ImmediateBatchFlushStrategy(container);
    const messages = _.times(3).map(() => Helper.generateDummyPayload());
    for (const message of messages) {
      container.addMessage(OwsMessageSubtype.Graph, message);
    }

    // when
    await container.flush();
    container.addMessage(OwsMessageSubtype.Graph, Helper.generateDummyPayload());
    await container.flush();

    // then
    expect(sendMessageSpy).to.be.calledTwice;
  });

  it('rejects all single message promises when batch rejects',
    async function () {
      // given
      const onedataWebsocket = new DummyBatchOnedataWebsocket();
      const sendMessageError = new Error('message send failed');
      sinon
        .stub(onedataWebsocket, 'sendMessage')
        .rejects(sendMessageError);
      const containerSpec = new DummyContainerSpec(
        new DummyContainerSpec(),
        onedataWebsocket,
      );
      const messagesNumber = 3;
      const container = new BatchRequestContainer(containerSpec, onedataWebsocket);
      container.flushStrategy = new CountBatchFlushStrategy(container, {
        requiredMessagesNumber: messagesNumber,
      });
      const messages = _.times(messagesNumber).map(() => Helper.generateDummyPayload());

      // when
      container.scheduleFlush();
      const responsePromises = messages.map(message =>
        container.addMessage(OwsMessageSubtype.Graph, message)
      );
      let flushError;
      try {
        await container.waitForFlush();
      } catch (error) {
        flushError = error;
      }

      // then
      expect(flushError).to.equal(sendMessageError);
      const promisesErrors = [];
      for (const responsePromise of responsePromises) {
        try {
          await responsePromise;
        } catch (error) {
          promisesErrors.push(error);
        }
      }
      expect(promisesErrors).to.have.lengthOf(messagesNumber);
      for (let i = 0; i < messagesNumber; ++i) {
        expect(promisesErrors[i]).to.equal(sendMessageError);
      }
    }
  );

  it('handles response when there is extra response without registered response handler', async function () {
    // given
    class ExtraBatchOnedataWebsocket extends DummyBatchOnedataWebsocket {
      async sendMessage() {
        const response = await super.sendMessage(...arguments);
        const batchResponses = response.payload.data.batch;
        const additionalResponse = {
          id: 'extra_response',
          type: OwsMessageType.Response,
          subtype: OwsMessageSubtype.Graph,
          payload: {
            success: true,
            error: null,
            data: {
              resource: {
                gri: 'extra_gri',
              },
              format: 'resource',
            },
          },
        };
        batchResponses.push(additionalResponse);
        return response;
      }
    }
    const onedataWebsocket = new ExtraBatchOnedataWebsocket();
    const containerSpec = new DummyContainerSpec(
      new DummyContainerSpec(),
      onedataWebsocket,
    );
    const container = new BatchRequestContainer(containerSpec, onedataWebsocket);
    container.flushStrategy =
      new ImmediateBatchFlushStrategy(container);
    const handleNoResponseHandlerSpy = sinon.spy(container, 'handleNoResponseHandler');
    const messages = _.times(2).map(() => Helper.generateDummyPayload());
    for (const message of messages) {
      container.addMessage(OwsMessageSubtype.Graph, message);
    }

    // when
    await container.flush();

    // then
    expect(handleNoResponseHandlerSpy).to.be.calledOnce;
  });

  it('handles response when it lacks some single response in batch', async function () {
    // given
    class IncompleteBatchOnedataWebsocket extends DummyBatchOnedataWebsocket {
      async sendMessage() {
        const response = await super.sendMessage(...arguments);
        const batchResponses = response.payload.data.batch;
        response.payload.data.batch = batchResponses.slice(0, batchResponses.length - 1);
        return response;
      }
    }
    const messagesNumber = 3;
    const onedataWebsocket = new IncompleteBatchOnedataWebsocket();
    const containerSpec = new DummyContainerSpec(
      new DummyContainerSpec(),
      onedataWebsocket,
    );
    const container = new BatchRequestContainer(containerSpec, onedataWebsocket);
    container.flushStrategy = new CountBatchFlushStrategy(container, {
      requiredMessagesNumber: messagesNumber,
    });
    const messages = _.times(messagesNumber).map(() => Helper.generateDummyPayload());

    // when
    container.scheduleFlush();
    const responsePromises = messages.map(message =>
      container.addMessage(OwsMessageSubtype.Graph, message)
    );
    await container.waitForFlush();

    // then
    const thirdResponse = await responsePromises.at(-1);
    expect(thirdResponse?.payload?.success).to.be.false;
    expect(thirdResponse.payload.error?.id).to.equal('noResponseInBatch');
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
  constructor(mochaContext) {
    this.mochaContext = mochaContext;
  }
  registerOnedataWebsocketService() {
    registerService(this.mochaContext, 'onedata-websocket', DummyBatchOnedataWebsocket);
    return lookupService(this.mochaContext, 'onedata-websocket');
  }
}
