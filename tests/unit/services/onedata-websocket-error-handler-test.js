import { expect } from 'chai';
import { describe, it, beforeEach } from 'mocha';
import { setupTest } from 'ember-mocha';
import { registerService, lookupService } from '../../helpers/stub-service';
import Service from '@ember/service';
import sinon from 'sinon';
import wait from 'ember-test-helpers/wait';

const OnedataWebsocket = Service.extend({
  closeConnection() {},
  getToken() {},
  initConnection() {},
});

describe('Unit | Service | onedata websocket error handler', function () {
  setupTest('service:onedata-websocket-error-handler', {});

  beforeEach(function () {
    registerService(this, 'onedata-websocket', OnedataWebsocket);
  });

  it('forces close and handshake on websocket service on abnormal close', function () {
    const onedataWebsocket = lookupService(this, 'onedata-websocket');
    const closeEvent = {};
    const openingCompleted = true;

    const service = this.subject();

    const closeConnection = sinon.stub(onedataWebsocket, 'closeConnection')
      .resolves();
    const initWebSocketConnection = sinon.stub(service, 'initWebSocketConnection')
      .resolves();

    service.abnormalClose(closeEvent, openingCompleted);
    return wait().then(() => {
      expect(closeConnection).to.be.calledOnce;
      expect(initWebSocketConnection).to.be.calledOnce;
    });
  });
});
