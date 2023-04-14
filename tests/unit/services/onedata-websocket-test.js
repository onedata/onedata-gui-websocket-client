import EmberObject from '@ember/object';
import Evented from '@ember/object/evented';
import { expect } from 'chai';
import { describe, it, beforeEach } from 'mocha';
import { setupTest } from 'ember-mocha';
import { settled } from '@ember/test-helpers';
import { registerService, lookupService } from '../../helpers/stub-service';
import Service from '@ember/service';
import sinon from 'sinon';
import { get } from '@ember/object';

class WebSocketMock {
  constructor() {
    setTimeout(() => this.onopen({}), 0);
  }
}

const OnedataWebsocketErrorHandler = Service.extend({
  errorOccured() {},
  abnormalClose() {},
});

describe('Unit | Service | onedata-websocket', function () {
  const { afterEach } = setupTest();

  beforeEach(function () {
    registerService(
      this,
      'onedataWebsocketErrorHandler',
      OnedataWebsocketErrorHandler
    );
    this.ownerApplicationBak = this.owner.application;
    this.owner.application = {
      guiContext: {},
    };
  });

  afterEach(function () {
    this.owner.application = this.ownerApplicationBak;
  });

  it('resolves initWebsocket promise by opening ws connection', async function () {
    let promiseResolved = false;
    const service = this.owner.lookup('service:onedata-websocket');

    service.set('_webSocketClass', WebSocketMock);
    const promise = service._initWebsocket();
    promise.then(() => {
      promiseResolved = true;
    });
    await settled();
    expect(promiseResolved).to.be.true;
  });

  it('sends event with message content when push message is sent', async function () {
    const service = this.owner.lookup('service:onedata-websocket');
    service.set('_webSocketClass', WebSocketMock);
    let pushHandlerDone = false;
    const pushHandler = function (m) {
      expect(m).to.equal('hello');
      pushHandlerDone = true;
    };

    EmberObject.extend(Evented).create({
      init() {
        service.on('push:graph', (m) => {
          pushHandler(m);
        });
      },
    });

    await service._initWebsocket();
    const _webSocket = service.get('_webSocket');
    _webSocket.onmessage({
      data: JSON.stringify({
        batch: [{
          type: 'push',
          subtype: 'graph',
          payload: 'hello',
        }],
      }),
    });
    await settled();
    expect(pushHandlerDone).to.be.true;
  });

  it('handles message responses', async function () {
    const service = this.owner.lookup('service:onedata-websocket');
    service.set('_webSocketClass', WebSocketMock);
    const messageId = 'some_message_id';
    const responsePayload = { x: 'good evening' };
    service.set('_generateUuid', () => messageId);

    await service._initWebsocket();
    const _webSocket = service.get('_webSocket');

    _webSocket.send = function () {
      setTimeout(() => {
        // response on any send
        this.onmessage({
          data: JSON.stringify({
            id: messageId,
            type: 'response',
            payload: responsePayload,
          }),
        });
      }, 0);
    };

    const message = await service.sendMessage({});
    expect(message).has.property('payload');
    expect(message.payload).has.property('x');
    expect(message.payload.x).to.equal(responsePayload.x);
  });

  it('does not invoke abnormal close handler when closed manually', async function () {
    const onedataWebsocketErrorHandler =
      lookupService(this, 'onedataWebsocketErrorHandler');
    let openResolved = false;
    let closeResolved = false;
    const abnormalClose = sinon.spy(onedataWebsocketErrorHandler, 'abnormalClose');

    const service = this.owner.lookup('service:onedata-websocket');

    service.set('_webSocketClass', WebSocketMock);

    const initPromise = service._initWebsocket();
    initPromise.then(() => {
      openResolved = true;
    });

    await settled();
    expect(openResolved).to.be.true;
    const closePromise = service.closeConnection();
    closePromise.then(() => {
      closeResolved = true;
    });
    await settled();
    expect(closeResolved).to.be.true;
    expect(abnormalClose).to.be.not.called;
  });

  it('invokes abnormal close handler when not closed manually', async function () {
    const onedataWebsocketErrorHandler =
      lookupService(this, 'onedataWebsocketErrorHandler');
    let openResolved = false;
    const abnormalClose = sinon.spy(onedataWebsocketErrorHandler, 'abnormalClose');
    const closeEvent = {};

    const service = this.owner.lookup('service:onedata-websocket');

    service.set('_webSocketClass', WebSocketMock);

    const initPromise = service._initWebsocket();
    initPromise.then(() => {
      openResolved = true;
    });

    await settled();
    expect(openResolved).to.be.true;
    const webSocket = get(service, '_webSocket');
    webSocket.onclose(closeEvent);
    await settled();
    expect(abnormalClose).to.be.calledWith(closeEvent);
  });

  it('invokes error handler when WebSocket onerror occures', async function () {
    const onedataWebsocketErrorHandler =
      lookupService(this, 'onedataWebsocketErrorHandler');
    let openResolved = false;
    const errorOccured = sinon.spy(onedataWebsocketErrorHandler, 'errorOccured');
    const errorEvent = {};

    const service = this.owner.lookup('service:onedata-websocket');

    service.set('_webSocketClass', WebSocketMock);

    const initPromise = service._initWebsocket();
    initPromise.then(() => {
      openResolved = true;
    });

    await settled();
    expect(openResolved).to.be.true;
    const webSocket = get(service, '_webSocket');
    webSocket.onerror(errorEvent);
    await settled();
    expect(errorOccured).to.be.calledWith(errorEvent);
  });
});
