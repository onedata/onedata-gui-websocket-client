import { expect } from 'chai';
import { describe, it, beforeEach } from 'mocha';
import { setupTest } from 'ember-mocha';
import sinon from 'sinon';
import { registerService, lookupService } from '../../helpers/stub-service';
import { resolve } from 'rsvp';
import { settled } from '@ember/test-helpers';
import { OwsGraphOperation } from 'onedata-gui-websocket-client/services/onedata-graph';
import { v4 as uuid } from 'ember-uuid';
import gri from 'onedata-gui-websocket-client/utils/gri';
import { OwsMessageType, OwsMessageSubtype } from 'onedata-gui-websocket-client/services/onedata-websocket';
import Service from '@ember/service';
import OnedataWebsocketService from '../../helpers/stubs/services/onedata-websocket';
import ActiveRequestsService from '../../helpers/stubs/services/active-requests';

// class DummyOnedataWebsocket extends OnedataWebsocketService {
//   async sendMessage() {
//     throw new Error('DummyOnedataWebsocket.sendMessage not implemented');
//   }
// }

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

  // FIXME: implement
  // it('uses batch to send messages that are containerized using BatchRequestRegistry', async function () {
  // });

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
