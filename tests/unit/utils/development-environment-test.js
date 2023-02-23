import { expect } from 'chai';
import { describe, it, beforeEach } from 'mocha';
import EmberObject from '@ember/object';
import {
  environmentExport,
  isDevelopment,
  isModelMocked,
} from 'onedata-gui-websocket-client/utils/development-environment';
import sinon from 'sinon';

describe('Unit | Utility | development-environment', function () {
  beforeEach(function () {
    this.storeStub = EmberObject.create({
      findRecord() {},
      userGri(userId) {
        return `user.${userId}.instance:private`;
      },
    });
  });

  it('detects if backend should be mocked', function () {
    const config = { APP: { MOCK_BACKEND: true } };
    const result = isDevelopment(config);
    expect(result).to.be.true;
  });

  it('returns symbol based on MOCK_BACKEND environment flag true', function () {
    const config = {
      APP: {
        MOCK_BACKEND: true,
      },
    };
    const Production = {};
    const Development = {};
    const result = environmentExport(config, Production, Development);
    expect(result).to.be.equal(Development);
  });

  it('returns symbol based on MOCK_BACKEND environment flag false', function () {
    const config = {
      APP: {},
    };
    const Production = {};
    const Development = {};
    const result = environmentExport(config, Production, Development);
    expect(result).to.be.equal(Production);
  });

  it('detects that model is already mocked', function (done) {
    const userRecord = {};
    const findRecord = sinon.stub(this.storeStub, 'findRecord');
    findRecord.withArgs('user', sinon.match(/.*stub_user_id.*/))
      .resolves(userRecord);

    const promise = isModelMocked(this.storeStub);
    promise.then(result => {
      expect(result).to.be.true;
      done();
    });
  });

  it('detects that model is not mocked', function (done) {
    sinon.stub(this.storeStub, 'findRecord')
      .withArgs('user', sinon.match(/.*stub_user_id.*/))
      .rejects();

    const promise = isModelMocked(this.storeStub);
    promise.then(result => {
      expect(result).to.be.false;
      done();
    });
  });
});
