import { expect } from 'chai';
import { describe, it, beforeEach } from 'mocha';
import { setupTest } from 'ember-mocha';
import sinon from 'sinon';
import { registerService, lookupService } from '../../helpers/stub-service';
import { resolve } from 'rsvp';
import { settled } from '@ember/test-helpers';

import OnedataWebsocketService from '../../helpers/stubs/services/onedata-websocket';
import ActiveRequestsService from '../../helpers/stubs/services/active-requests';

describe('Unit | Service | onedata rpc', function () {
  setupTest();

  beforeEach(function () {
    registerService(this, 'onedata-websocket', OnedataWebsocketService);
    registerService(this, 'active-requests', ActiveRequestsService);
  });

  it('can use onedata-websocket mock handleSendRpc', async function () {
    const service = this.owner.lookup('service:onedata-rpc');
    const ws = lookupService(this, 'onedata-websocket');
    const handleSendRpc = sinon.spy({
      handleSendRpc() {
        return resolve({
          payload: {
            success: true,
            args: {},
          },
        });
      },
    }, 'handleSendRpc');

    ws.set('handleSendRpc', handleSendRpc);
    await ws.initConnection();
    service.request('testRpc', { hello: 'world' });
    await settled();
    expect(handleSendRpc).to.be.calledOnce;
    expect(handleSendRpc).to.be.calledWith({
      function: 'testRpc',
      args: { hello: 'world' },
    });
  });
});
