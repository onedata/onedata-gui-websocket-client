import { expect } from 'chai';
import { describe, it } from 'mocha';
import { setupTest } from 'ember-mocha';

describe('Unit | Service | mocks/onedata-rpc', function () {
  setupTest();

  it('responds to testRPC like echo', async function () {
    const service = this.owner.lookup('service:mocks/onedata-rpc');

    const promise = service.request('testRPC', { echo: 'hello' });

    expect(await promise).to.deep.equal({ echo: 'hello' });
  });
});
