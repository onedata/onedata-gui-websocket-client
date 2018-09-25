import { expect } from 'chai';
import { describe, it, beforeEach } from 'mocha';
import { setupModelTest } from 'ember-mocha';
import sinon from 'sinon';
import Service from '@ember/service';

import { registerService, lookupService } from '../../helpers/stub-service';
import OnedataGraphStub from '../../helpers/stubs/services/onedata-graph';

describe('Unit | Model | group', function () {
  setupModelTest('group', {
    needs: ['service:onedata-token-api'],
  });

  beforeEach(function () {
    registerService(this, 'onedata-graph', OnedataGraphStub);
    registerService(this, 'onedata-graph-utils', Service);
  });

  it('resolves invite token using token api service and graph', function (done) {
    let record = this.subject();
    record.set('id', 'group.some_id.instance');

    const TOKEN = 'abcd';
    let graph = lookupService(this, 'onedata-graph');
    let graphRequestStub = sinon.stub(graph, 'request');
    let graphData = TOKEN;
    let graphValidArgs = {
      gri: sinon.match(new RegExp('.*group.*some_id.*invite.*user.*')),
      operation: 'create',
      subscribe: false,
    };
    graphRequestStub
      .withArgs(graphValidArgs)
      .resolves(graphData);

    let promise = record.getInviteToken('user');
    expect(graphRequestStub).to.be.calledWith(graphValidArgs);
    promise.then(token => {
      expect(token).to.equal(TOKEN);
      done();
    });
  });
});
