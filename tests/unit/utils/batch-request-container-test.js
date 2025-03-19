import { expect } from 'chai';
import { describe, it } from 'mocha';
import BatchRequestContainer from 'onedata-gui-websocket-client/utils/batch-request-container';
import { v4 as uuid } from 'ember-uuid';
import gri from 'onedata-gui-websocket-client/utils/gri';
import { OnedataGraphOperation } from 'onedata-gui-websocket-client/services/onedata-graph';
import _ from 'lodash';
import sinon from 'sinon';

/**
 * @implements {BaseBatchContainerSpec}
 */
class DummyContainerSpec {
  matches() {
    return true;
  }
}

class DummyOnedataWebsocket {
  /** @type {BatchRequestWebsocketMessage} */
  async sendMessage(message) {
    if (!message.batch) {
      throw new Error('DummyOnedataWebsocket.sendMessage: only batch is mocked');
    }
    // throw new Error('DummyOnedataWebsocket.sendMessage not implemented');
    const responses = message.batch.map(request => this.handleSingleMessage(request));
    return {

    };
  }
  handleSingleMessage(message) {

  }
}

describe('Unit | Utility | batch-request-container', function () {
  it('can be instantiated', function () {
    // given
    const containerSpec = new DummyContainerSpec(
      new DummyContainerSpec(),
      new DummyOnedataWebsocket(),
    );

    // when
    const container = new BatchRequestContainer(containerSpec);

    // then
    expect(container).to.be.ok;
  });

  it('has private method to create a single batch message from multiple messages', function () {
    // given
    const containerSpec = new DummyContainerSpec(
      new DummyContainerSpec(),
      new DummyOnedataWebsocket(),
    );
    const container = new BatchRequestContainer(containerSpec);
    const messages = _.times(3).map(() => Helper.generateDummyMessage());
    for (const message of messages) {
      container.addMessage(message);
    }

    // when
    const batchMessage = container.createBatchMessage();

    // then
    expect(batchMessage).to.deep.equal({
      batch: [
        messages[0],
        messages[1],
        messages[2],
      ],
    });
  });

  it('', function () {
    // given
    const onedataWebsocket = new DummyOnedataWebsocket();
    sinon.stub(onedataWebsocket, 'sendMessage').resolves();
    const containerSpec = new DummyContainerSpec(
      new DummyContainerSpec(),
      onedataWebsocket,
    );
    const container = new BatchRequestContainer(containerSpec);
    const messages = _.times(3).map(() => Helper.generateDummyMessage());
    for (const message of messages) {
      container.addMessage(message);
    }

    // when
    const batchMessage = container.createBatchMessage();

    // then
    expect(batchMessage).to.deep.equal({
      batch: [
        messages[0],
        messages[1],
        messages[2],
      ],
    });
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
  static generateDummyMessage() {
    return {
      gri: Helper.generateGri(),
      operation: OnedataGraphOperation.Gri,
    };
  }
}
