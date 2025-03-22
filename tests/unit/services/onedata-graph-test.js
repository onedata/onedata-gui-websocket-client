import { expect } from 'chai';
import { describe, it } from 'mocha';
import { setupTest } from 'ember-mocha';
import sinon from 'sinon';
import { registerService, lookupService } from '../../helpers/stub-service';
import { OwsGraphOperation } from 'onedata-gui-websocket-client/services/onedata-graph';
import { v4 as uuid } from 'ember-uuid';
import gri from 'onedata-gui-websocket-client/utils/gri';
import { OwsMessageType, OwsMessageSubtype } from 'onedata-gui-websocket-client/services/onedata-websocket';
import OnedataWebsocketService from '../../helpers/stubs/services/onedata-websocket';
import ActiveRequestsService from '../../helpers/stubs/services/active-requests';
import { DummyBatchOnedataWebsocket } from '../../helpers/dummy-batch-onedata-websocket';
import GrisBatchContainerSpec from 'onedata-gui-websocket-client/utils/gris-batch-container-spec';
import _ from 'lodash';
import {
  CountBatchFlushStrategy,
} from 'onedata-gui-websocket-client/utils/batch-flush-strategies';

describe('Unit | Service | onedata-graph', function () {
  setupTest();

  it('uses OnedataWebsocket to send message', async function () {
    // given
    registerService(this, 'onedata-websocket', OnedataWebsocketService);
    registerService(this, 'active-requests', ActiveRequestsService);
    const onedataWebsocket = lookupService(this, 'onedata-websocket');
    const dummyGri = Helper.generateGri();
    const sendMessage = sinon.stub(onedataWebsocket, 'sendMessage').resolves({
      id: uuid(),
      type: OwsMessageType.Response,
      subtype: OwsMessageSubtype.Graph,
      payload: {
        success: true,
        error: null,
        data: {
          gri: dummyGri,
        },
      },
    });

    const service = this.owner.lookup('service:onedata-graph');
    /** @type {OwsGraphRequestPayload} */
    const requestPayload = {
      gri: dummyGri,
      operation: OwsGraphOperation.Get,
    };

    // when
    await service.request(requestPayload);

    // then
    expect(sendMessage).to.be.calledOnce;
    const sendMessageCall = sendMessage.getCall(0);
    expect(sendMessageCall.args[0]).to.equal(OwsMessageSubtype.Graph);
    const payloadArg = sendMessageCall.args[1];
    expect(payloadArg).to.have.property('gri', requestPayload.gri);
    expect(payloadArg).to.have.property('operation', requestPayload.operation);
  });

  it('uses batch to send messages that are containerized using BatchRequestRegistry', async function () {
    // given
    registerService(this, 'onedata-websocket', OnedataWebsocketService);
    registerService(this, 'active-requests', ActiveRequestsService);
    const onedataWebsocket = lookupService(this, 'onedata-websocket');
    const dummyGris = _.times(3).map(() => Helper.generateGri());
    const sendMessage = sinon.stub(onedataWebsocket, 'sendMessage').resolves({
      id: uuid(),
      type: OwsMessageType.Response,
      subtype: OwsMessageSubtype.Batch,
      payload: {
        success: true,
        error: null,
        data: {
          batch: [],
        },
      },
    });
    const service = this.owner.lookup('service:onedata-graph');
    const containerSpec = new GrisBatchContainerSpec(
      OwsGraphOperation.Get,
      dummyGris
    );
    const batchRequestRegistry = this.owner.lookup('service:batch-request-registry');
    const batchContainer = batchRequestRegistry.createContainer(
      containerSpec,
      CountBatchFlushStrategy, { requiredMessagesNumber: dummyGris.length }
    );

    try {
      // when
      const resourcePromises = [];
      for (let i = 0; i < dummyGris.length; ++i) {
        const promise = service.request({
          gri: dummyGris[i],
          operation: OwsGraphOperation.Get,
        });
        resourcePromises.push(promise);
      }
      batchContainer.scheduleFlush();
      await batchContainer.waitForFlush();

      // then
      expect(sendMessage).to.be.calledOnce;
      const sendMessageCall = sendMessage.getCall(0);
      expect(sendMessageCall.args[0]).to.equal(OwsMessageSubtype.Batch);
      const mainPayloadArg = sendMessageCall.args[1];
      expect(mainPayloadArg).to.have.property('batch');
      expect(mainPayloadArg.batch).to.have.lengthOf(3);
    } finally {
      batchRequestRegistry.destroyContainer(batchContainer);
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
}
