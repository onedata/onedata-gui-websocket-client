import { expect } from 'chai';
import { describe, it, beforeEach } from 'mocha';
import { setupTest } from 'ember-mocha';

import { registerService, lookupService } from '../../helpers/stub-service';
import GraphContextStub from '../../helpers/stubs/services/onedata-graph-context';
import RecordRegistryStub from '../../helpers/stubs/services/onedata-graph-context';
import sinon from 'sinon';

describe('Unit | Serializer | context-collection', function () {
  setupTest();

  beforeEach(function () {
    registerService(this, 'onedata-graph-context', GraphContextStub);
    registerService(this, 'record-registry', RecordRegistryStub);
  });

  it('uses onedata-graph-context to register context of list records', function () {
    const hash = {
      gri: 'hello.world.foo',
      list: ['one.two.three', 'five.six.seven'],
    };

    const graphContext = lookupService(this, 'onedata-graph-context');
    const registerStub = sinon.stub(graphContext, 'registerArray');

    const serializer = this.owner.lookup('service:store')
      .serializerFor('-context-collection');

    serializer.registerContextForItems(hash);

    expect(registerStub).to.have.been.calledOnce;
  });
});
