import { expect } from 'chai';
import { describe, it, beforeEach } from 'mocha';
import { setupTest } from 'ember-mocha';

import sinon from 'sinon';
const {
  stub,
} = sinon;

import { registerService, lookupService } from '../../helpers/stub-service';
import OnedataGraphStub from '../../helpers/stubs/services/onedata-graph';
import OnedataGraphContextStub from '../../helpers/stubs/services/onedata-graph-context';
import RecordRegistryStub from '../../helpers/stubs/services/onedata-graph-context';
import ActiveRequestsStub from '../../helpers/stubs/services/active-requests';

function getModelType(modelName) {
  return {
    modelName,
    findBlockingRequests() {
      return [];
    },
  };
}

describe('Unit | Adapter | onedata-websocket', function () {
  setupTest();

  beforeEach(function () {
    registerService(this, 'onedata-graph', OnedataGraphStub);
    registerService(this, 'onedata-graph-context', OnedataGraphContextStub);
    registerService(this, 'record-registry', RecordRegistryStub);
    registerService(this, 'active-requests', ActiveRequestsStub);
  });

  it('uses graph service to findRecord', function () {
    const store = {};
    const type = getModelType();
    const recordId = 'record.record_id.instance:private';
    const graphData = {};
    const adapter = this.owner.lookup('adapter:onedata-websocket');

    const graph = lookupService(this, 'onedata-graph');
    const graphRequestStub = stub(graph, 'request');
    graphRequestStub.throws('onedata-graph#request called with wrong args');
    graphRequestStub
      .withArgs({
        gri: recordId,
        operation: 'get',
        authHint: undefined,
        subscribe: true,
      })
      .resolves(graphData);

    const graphContext = lookupService(this, 'onedata-graph-context');
    stub(graphContext, 'getAuthHint').returns(undefined);

    return adapter.findRecord(store, type, recordId, {}).then(adapterRecord => {
      expect(adapterRecord).to.equal(graphData);
    });
  });

  it('uses graph service to createRecord with support for metadata',
    function () {
      const store = {};
      const modelName = 'something';
      const type = getModelType(modelName);
      const authHint = ['asUser', 'u1'];
      const recordData = {
        foo: 'bar',
        one: null,
      };
      const snapshot = {
        record: {
          _meta: {
            authHint,
          },
        },
        serialize: () => recordData,
      };
      const retGraphData = {};
      const adapter = this.owner.lookup('adapter:onedata-websocket');
      const graph = lookupService(this, 'onedata-graph');
      const graphRequestStub = stub(graph, 'request');
      const graphValidArgs = {
        gri: 'something.null.instance:auto',
        operation: 'create',
        // data for graph is stripped from _meta
        data: { foo: 'bar', one: null },
        authHint,
        subscribe: true,
      };
      graphRequestStub
        .withArgs(graphValidArgs)
        .resolves(retGraphData);

      return adapter.createRecord(store, type, snapshot).then(createResult => {
        expect(graphRequestStub).to.be.calledWith(graphValidArgs);
        expect(createResult).to.equal(retGraphData);
      });
    });

  it('uses graph service to updateRecord', function () {
    const store = {};
    const modelName = 'something';
    const type = getModelType(modelName);
    const recordId = 'a.b.c:private';
    const recordData = {
      foo: 'bar',
    };
    const snapshot = {
      record: {
        id: recordId,
      },
      serialize() {
        return recordData;
      },
    };
    const graphData = {};
    const adapter = this.owner.lookup('adapter:onedata-websocket');

    const graph = lookupService(this, 'onedata-graph');
    const graphRequestStub = stub(graph, 'request');
    const graphValidArgs = {
      gri: recordId,
      operation: 'update',
      data: recordData,
    };
    graphRequestStub
      .withArgs(graphValidArgs)
      .resolves(graphData);

    return adapter.updateRecord(store, type, snapshot).then(createResult => {
      expect(graphRequestStub).to.be.calledWith(graphValidArgs);
      expect(createResult).to.equal(graphData);
    });
  });

  it('uses graph service to deleteRecord', function () {
    const store = {};
    const modelName = 'something';
    const type = getModelType(modelName);
    const recordId = 'a.b.c:private';
    const recordData = {
      foo: 'bar',
    };
    const snapshot = {
      record: {
        id: recordId,
      },
      serialize() {
        return recordData;
      },
    };
    const graphData = {};
    const adapter = this.owner.lookup('adapter:onedata-websocket');

    const graph = lookupService(this, 'onedata-graph');
    const graphRequestStub = stub(graph, 'request');
    const graphValidArgs = {
      gri: recordId,
      operation: 'delete',
    };
    graphRequestStub
      .withArgs(graphValidArgs)
      .resolves(graphData);

    return adapter.deleteRecord(store, type, snapshot).then(createResult => {
      expect(graphRequestStub).to.be.calledWith(graphValidArgs);
      expect(createResult).to.equal(graphData);
    });
  });
});
