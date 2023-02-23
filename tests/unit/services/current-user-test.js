import { expect } from 'chai';
import { describe, it, beforeEach } from 'mocha';
import { setupTest } from 'ember-mocha';

import sinon from 'sinon';
const {
  stub,
} = sinon;

import { registerService, lookupService } from '../../helpers/stub-service';
import SessionStub from '../../helpers/stubs/services/session';
import StoreStub from '../../helpers/stubs/services/store';

describe('Unit | Service | current-user', function () {
  setupTest();

  beforeEach(function () {
    registerService(this, 'session', SessionStub);
    registerService(this, 'store', StoreStub);
  });

  it('returns user record provided by store if available', function (done) {
    const userEntityId = 'user1';
    const userRecord = {};
    lookupService(this, 'session').set(
      'data.authenticated.identity.user',
      userEntityId
    );
    const store = lookupService(this, 'store');
    const findRecord = stub(store, 'findRecord');
    findRecord
      .withArgs('user', sinon.match(new RegExp(`.*${userEntityId}.*`)))
      .resolves(userRecord);
    const userGri = stub(store, 'userGri');
    userGri
      .withArgs('user1')
      .returns('user.user1.instance:private');

    const service = this.owner.lookup('service:current-user');

    service.getCurrentUserRecord().then(record => {
      expect(record).to.equal(userRecord);
      done();
    });

    expect(service).to.be.ok;
  });
});
