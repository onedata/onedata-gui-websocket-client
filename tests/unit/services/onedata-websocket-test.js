import EmberObject from '@ember/object';
import Evented from '@ember/object/evented';
import { expect } from 'chai';
import { describe, it, beforeEach } from 'mocha';
import { setupTest } from 'ember-mocha';
import wait from 'ember-test-helpers/wait';
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

describe('Unit | Service | onedata websocket', function () {
  setupTest('service:onedata-websocket', {
    needs: [],
  });

  beforeEach(function () {
    registerService(
      this,
      'onedataWebsocketErrorHandler',
      OnedataWebsocketErrorHandler
    );
  });

  it('resolves initWebsocket promise by opening ws connection', function (done) {
    let promiseResolved = false;
    let service = this.subject();

    service.set('_webSocketClass', WebSocketMock);

    let promise = service._initWebsocket();
    promise.then(() => {
      promiseResolved = true;
    });
    wait().then(() => {
      expect(promiseResolved).to.be.true;
      done();
    });
  });

  it('sends event with message content when push message is sent', function (done) {
    let service = this.subject();
    service.set('_webSocketClass', WebSocketMock);
    let pushHandlerDone = false;
    let pushHandler = function (m) {
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

    service._initWebsocket().then(() => {
      let _webSocket = service.get('_webSocket');
      _webSocket.onmessage({
        data: JSON.stringify({
          batch: [{
            type: 'push',
            subtype: 'graph',
            payload: 'hello',
          }],
        }),
      });
      wait().then(() => {
        expect(pushHandlerDone).to.be.true;
        done();
      });
    });
  });

  it('handles message responses', function (done) {
    let service = this.subject();
    service.set('_webSocketClass', WebSocketMock);
    const messageId = 'some_message_id';
    const responsePayload = { x: 'good evening' };
    service.set('_generateUuid', () => messageId);

    service._initWebsocket().then(() => {
      let _webSocket = service.get('_webSocket');

      _webSocket.send = function () {
        window.setTimeout(() => {
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

      service.sendMessage({}).then(m => {
        expect(m).has.property('payload');
        expect(m.payload).has.property('x');
        expect(m.payload.x).to.equal(responsePayload.x);
        done();
      });
    });
  });

  it('does not invoke abnormal close handler when closed manually', function () {
    const onedataWebsocketErrorHandler =
      lookupService(this, 'onedataWebsocketErrorHandler');
    let openResolved = false;
    let closeResolved = false;
    const abnormalClose = sinon.spy(onedataWebsocketErrorHandler, 'abnormalClose');

    const service = this.subject();

    service.set('_webSocketClass', WebSocketMock);

    const initPromise = service._initWebsocket();
    initPromise.then(() => {
      openResolved = true;
    });

    return wait().then(() => {
      expect(openResolved).to.be.true;
      const closePromise = service.closeConnection();
      closePromise.then(() => {
        closeResolved = true;
      });
      return wait().then(() => {
        expect(closeResolved).to.be.true;
        expect(abnormalClose).to.be.notCalled;
      });
    });
  });

  it('invokes abnormal close handler when not closed manually', function () {
    const onedataWebsocketErrorHandler =
      lookupService(this, 'onedataWebsocketErrorHandler');
    let openResolved = false;
    const abnormalClose = sinon.spy(onedataWebsocketErrorHandler, 'abnormalClose');
    const closeEvent = {};

    const service = this.subject();

    service.set('_webSocketClass', WebSocketMock);

    const initPromise = service._initWebsocket();
    initPromise.then(() => {
      openResolved = true;
    });

    return wait().then(() => {
      expect(openResolved).to.be.true;
      const webSocket = get(service, '_webSocket');
      webSocket.onclose(closeEvent);
      return wait().then(() => {
        expect(abnormalClose).to.be.calledWith(closeEvent);
      });
    });
  });

  it('invokes error handler when WebSocket onerror occures', function () {
    const onedataWebsocketErrorHandler =
      lookupService(this, 'onedataWebsocketErrorHandler');
    let openResolved = false;
    const errorOccured = sinon.spy(onedataWebsocketErrorHandler, 'errorOccured');
    const errorEvent = {};

    const service = this.subject();

    service.set('_webSocketClass', WebSocketMock);

    const initPromise = service._initWebsocket();
    initPromise.then(() => {
      openResolved = true;
    });

    return wait().then(() => {
      expect(openResolved).to.be.true;
      const webSocket = get(service, '_webSocket');
      webSocket.onerror(errorEvent);
      return wait().then(() => {
        expect(errorOccured).to.be.calledWith(errorEvent);
      });
    });
  });
});
