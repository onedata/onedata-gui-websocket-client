import { expect } from 'chai';
import { describe, it, beforeEach } from 'mocha';
import EmberObject from '@ember/object';
import RoutesDevelopmentModelMixin from 'onedata-gui-websocket-client/mixins/routes/development-model';
import sinon from 'sinon';
import wait from 'ember-test-helpers/wait';
import { resolve } from 'rsvp';

const storeStub = {};
const envConfig = {};

describe('Unit | Mixin | routes/development model', function () {
  beforeEach(function () {
    this.RoutesDevelopmentModelObject =
      EmberObject.extend(RoutesDevelopmentModelMixin, {
        envConfig,
        store: storeStub,
        generateDevelopmentModel() {},
        clearDevelopmentModel: () => resolve(),
        isDevelopment() {},
        isModelMocked() {},
      });
  });

  it('resolves beforeModel if model is already mocked', function (done) {
    const subject = this.RoutesDevelopmentModelObject.create();

    const generateDevelopmentModel = sinon.stub(subject, 'generateDevelopmentModel');
    const clearDevelopmentModel = sinon.spy(subject, 'clearDevelopmentModel');
    const isDevelopment = sinon.stub(subject, 'isDevelopment');
    isDevelopment.returns(true);
    const isModelMocked = sinon.stub(subject, 'isModelMocked');
    isModelMocked.resolves(true);

    const promise = subject.beforeModel();

    wait().then(() => {
      expect(isDevelopment).to.be.calledOnce;
      expect(isModelMocked).to.be.called;
      expect(clearDevelopmentModel).to.be.called;
      expect(generateDevelopmentModel).to.not.be.called;
      expect(promise).to.eventually.be.fulfilled.notify(done);
    });
  });

  it('invokes generateDevelopmentModel if model is not mocked yet', function (done) {
    const subject = this.RoutesDevelopmentModelObject.create();

    const generateDevelopmentModel = sinon.stub(subject, 'generateDevelopmentModel');
    const clearDevelopmentModel = sinon.spy(subject, 'clearDevelopmentModel');
    generateDevelopmentModel.resolves();
    const isDevelopment = sinon.stub(subject, 'isDevelopment');
    isDevelopment.returns(true);
    const isModelMocked = sinon.stub(subject, 'isModelMocked');
    isModelMocked.resolves(false);

    const promise = subject.beforeModel();
    wait().then(() => {
      expect(isDevelopment).to.be.calledOnce;
      expect(isModelMocked).to.be.called;
      expect(clearDevelopmentModel).to.be.called;
      expect(generateDevelopmentModel).to.be.calledOnce;
      expect(promise).to.eventually.be.fulfilled.notify(done);
    });
  });
});
