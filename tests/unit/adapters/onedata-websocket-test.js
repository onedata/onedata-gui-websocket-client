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

describe('Unit | Adapter | onedata websocket', function () {
  setupTest('adapter:onedata-websocket', {
    needs: [],
  });

  beforeEach(function () {
    registerService(this, 'onedata-graph', OnedataGraphStub);
    registerService(this, 'onedata-graph-context', OnedataGraphContextStub);
    registerService(this, 'record-registry', RecordRegistryStub);
    registerService(this, 'active-requests', ActiveRequestsStub);
  });

  it('uses graph service to findRecord', function () {
    let store = {};
    let type = getModelType();
    let recordId = 'record.record_id.instance:private';
    let graphData = {};
    let adapter = this.subject();

    let graph = lookupService(this, 'onedata-graph');
    let graphRequestStub = stub(graph, 'request');
    graphRequestStub.throws('onedata-graph#request called with wrong args');
    graphRequestStub
      .withArgs({
        gri: recordId,
        operation: 'get',
        authHint: undefined,
        subscribe: true,
      })
      .resolves(graphData);

    let graphContext = lookupService(this, 'onedata-graph-context');
    stub(graphContext, 'getAuthHint').returns(undefined);

    return adapter.findRecord(store, type, recordId, {}).then(adapterRecord => {
      expect(adapterRecord).to.equal(graphData);
    });
  });

  it('uses graph service to createRecord with support for metadata',
    function () {
      let store = {};
      let modelName = 'something';
      let type = getModelType(modelName);
      let authHint = ['asUser', 'u1'];
      let recordData = {
        foo: 'bar',
        one: null,
      };
      let snapshot = {
        record: {
          toJSON: () => recordData,
          _meta: {
            authHint,
          },
        },
      };
      let retGraphData = {};
      let adapter = this.subject();
      let graph = lookupService(this, 'onedata-graph');
      let graphRequestStub = stub(graph, 'request');
      let graphValidArgs = {
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
    let store = {};
    let modelName = 'something';
    let type = getModelType(modelName);
    let recordId = 'a.b.c:private';
    let recordData = {
      foo: 'bar',
    };
    let snapshot = {
      record: {
        toJSON() {
          return recordData;
        },
        id: recordId,
      },
    };
    let graphData = {};
    let adapter = this.subject();

    let graph = lookupService(this, 'onedata-graph');
    let graphRequestStub = stub(graph, 'request');
    let graphValidArgs = {
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
    let store = {};
    let modelName = 'something';
    let type = getModelType(modelName);
    let recordId = 'a.b.c:private';
    let recordData = {
      foo: 'bar',
    };
    let snapshot = {
      record: {
        toJSON() {
          return recordData;
        },
        id: recordId,
      },
    };
    let graphData = {};
    let adapter = this.subject();

    let graph = lookupService(this, 'onedata-graph');
    let graphRequestStub = stub(graph, 'request');
    let graphValidArgs = {
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
