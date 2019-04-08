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
    const token = 'token';
    const initData = {};
    const closeEvent = {};
    const openingCompleted = true;

    const service = this.subject();

    const closeConnection = sinon.stub(onedataWebsocket, 'closeConnection')
      .resolves();
    const getToken = sinon.stub(service, 'getToken')
      .resolves(token);
    const initConnection = sinon.stub(onedataWebsocket, 'initConnection')
      .resolves(initData);

    service.abnormalClose(closeEvent, openingCompleted);
    return wait().then(() => {
      expect(closeConnection).to.be.calledOnce;
      expect(getToken).to.be.calledOnce;
      expect(initConnection).to.be.calledOnce;
      expect(initConnection).to.be.calledWith({ token });
    });
  });
});
