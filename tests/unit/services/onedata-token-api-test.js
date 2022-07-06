import { expect } from 'chai';
import { describe, it, beforeEach } from 'mocha';
import { setupTest } from 'ember-mocha';
import sinon from 'sinon';
import { settled } from '@ember/test-helpers';

import { registerService, lookupService } from '../../helpers/stub-service';
import OnedataGraphStub from '../../helpers/stubs/services/onedata-graph';

describe('Unit | Service | onedata token api', function () {
  setupTest();

  beforeEach(function () {
    registerService(this, 'onedata-graph', OnedataGraphStub);
  });

  it('resolves invite token data using graph', async function () {
    const service = this.owner.lookup('service:onedata-token-api');

    const TOKEN = 'abcd';
    const graph = lookupService(this, 'onedata-graph');
    const graphRequestStub = sinon.stub(graph, 'request');
    const graphData = TOKEN;
    const graphValidArgs = {
      gri: sinon.match(new RegExp('.*group.*some_id.*invite.*user.*')),
      operation: 'create',
      subscribe: false,
    };
    graphRequestStub
      .withArgs(graphValidArgs)
      .resolves(graphData);

    const promise = service.getInviteToken('group', 'some_id', 'user');

    await settled();
    expect(graphRequestStub).to.be.calledWith(graphValidArgs);
    await expect(promise).to.eventually.be.equal(TOKEN);
  });
});
