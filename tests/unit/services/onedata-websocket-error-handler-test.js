import { expect } from 'chai';
import { describe, it, beforeEach } from 'mocha';
import { setupTest } from 'ember-mocha';
import { registerService, lookupService } from '../../helpers/stub-service';
import Service from '@ember/service';
import sinon from 'sinon';
import { settled } from '@ember/test-helpers';

const OnedataWebsocket = Service.extend({
  closeConnection() {},
  getToken() {},
  initConnection() {},
});

describe('Unit | Service | onedata-websocket-error-handler', function () {
  setupTest();

  beforeEach(function () {
    registerService(this, 'onedata-websocket', OnedataWebsocket);
  });

  it('forces close and handshake on websocket service on abnormal close', async function () {
    const onedataWebsocket = lookupService(this, 'onedata-websocket');
    const closeEvent = {};
    const openingCompleted = true;

    const service = this.owner.lookup('service:onedata-websocket-error-handler');

    const closeConnection = sinon.stub(onedataWebsocket, 'closeConnection')
      .resolves();
    const initWebSocketConnection = sinon.stub(service, 'initWebSocketConnection')
      .resolves();

    service.abnormalClose(closeEvent, openingCompleted);
    await settled();
    expect(closeConnection).to.be.calledOnce;
    expect(initWebSocketConnection).to.be.calledOnce;
  });
});
