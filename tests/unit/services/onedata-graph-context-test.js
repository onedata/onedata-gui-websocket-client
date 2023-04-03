import { expect } from 'chai';
import { describe, it } from 'mocha';
import { setupTest } from 'ember-mocha';

describe('Unit | Service | onedata-graph-context', function () {
  setupTest();

  it('removes specific registered context, leaving previous contexts', function () {
    const requestedId = 'a:b:c';
    const firstContext = 'group.abc.children';
    const secondContext = 'space.def.groups';
    const service = this.owner.lookup('service:onedata-graph-context');

    service.register(requestedId, firstContext);
    service.register(requestedId, secondContext);
    service.deregister(secondContext);
    const resultContext = service.getContext(requestedId);

    expect(resultContext).to.equal(firstContext);
  });

  // Replace this with your real tests.
  it('returns last registered context', function () {
    const requestedId = 'a:b:c';
    const firstContext = 'group.abc.children';
    const secondContext = 'space.def.groups';
    const service = this.owner.lookup('service:onedata-graph-context');

    service.register(requestedId, firstContext);
    service.register(requestedId, secondContext);
    const resultContext = service.getContext(requestedId);

    expect(resultContext).to.equal(secondContext);
  });
});
