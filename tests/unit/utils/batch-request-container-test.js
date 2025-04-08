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
import { ImmediateBatchFlushStrategy } from 'onedata-gui-websocket-client/utils/batch-flush-strategies';
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
