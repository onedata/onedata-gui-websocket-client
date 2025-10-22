/* eslint-disable no-restricted-globals */
import { expect } from 'chai';
import { describe, it } from 'mocha';
import { setupTest } from 'ember-mocha';
import GraphSingleModelMixin from 'onedata-gui-websocket-client/mixins/models/graph-single-model';
import Model from '@ember-data/model';
import sinon from 'sinon';
import { lookupService } from '../../../helpers/stub-service';
import useLocalStorageForStore from '../../../helpers/use-local-storage-for-store';
import StaticGraphModelMixin from 'onedata-gui-websocket-client/mixins/models/static-graph-model';
import resetStorages from 'ember-local-storage/test-support/reset-storage';
import { settled } from '@ember/test-helpers';
import { belongsTo, hasMany } from 'onedata-gui-websocket-client/utils/relationships';

describe('Integration | Mixin | graph-single-model', function () {
  const { beforeEach, afterEach } = setupTest();

  beforeEach(function () {
    this.model = Model
      .extend(GraphSingleModelMixin)
      .reopenClass(StaticGraphModelMixin);
    this.owner.register('model:my-model', this.model);
    useLocalStorageForStore(this);
  });

  afterEach(function () {
    resetStorages();
    localStorage?.clear();
    sessionStorage?.clear();
  });

  it('invokes recalculateListsWithEntity on store if record gets deleted',
    async function () {
      const store = lookupService(this, 'store');
      const record = store.createRecord('my-model', {});
      const recalculateSpy = sinon.spy(store, 'recalculateListsWithEntity');

      await record.save();
      await record.destroyRecord();
      // recalculation is done by async observer
      await settled();

      expect(recalculateSpy).to.have.been.calledOnce;
    }
  );

  it('does not invoke recalculateListsWithEntity on store if record deletion fails be persisted',
    async function () {
      const store = lookupService(this, 'store');
      const record = store.createRecord('my-model', {});
      const recalculateSpy = sinon.spy(store, 'recalculateListsWithEntity');

      const adapter = store.adapterFor('my-model');

      adapter.deleteRecord = async () => {
        throw new Error('stubbed error');
      };

      await record.save();
      try {
        await record.destroyRecord();
      } catch {
        // the error is expected
      }

      expect(recalculateSpy).to.have.not.been.called;
    }
  );

  it('reloadList: reloads only list relation (ids) by default', async function () {
    // given
    const store = lookupService(this, 'store');
    const recordRegistry = lookupService(this, 'recordRegistry');
    registerListModel(this);
    const r1 = await store.createRecord('my-model', {}).save();
    const r2 = await store.createRecord('my-model', {}).save();
    recordRegistry.registerId(r1.id, 'my-model');
    recordRegistry.registerId(r2.id, 'my-model');
    const listRecord = await store.createRecord('list-model', { list: [r1, r2] }).save();
    const aggregatingRecord =
      await store.createRecord('aggregating-model', { someList: listRecord }).save();
    const listReloadSpy = sinon.spy(listRecord, 'reload');

    // when
    await aggregatingRecord.reloadList('someList');

    // then
    expect(listReloadSpy).to.have.been.calledOnce;
  });

  it('reloadList: reloads records on list with reloadRecords option', async function () {
    // given
    const store = lookupService(this, 'store');
    const recordRegistry = lookupService(this, 'recordRegistry');
    registerListModel(this);
    const r1 = await store.createRecord('my-model', {}).save();
    const r2 = await store.createRecord('my-model', {}).save();
    recordRegistry.registerId(r1.id, 'my-model');
    recordRegistry.registerId(r2.id, 'my-model');
    const r1ReloadSpy = sinon.spy(r1, 'reload');
    const r2ReloadSpy = sinon.spy(r2, 'reload');
    const listRecord = await store.createRecord('list-model', { list: [r1, r2] }).save();
    const aggregatingRecord =
      await store.createRecord('aggregating-model', { someList: listRecord }).save();
    const listReloadSpy = sinon.spy(listRecord, 'reload');

    // when
    await aggregatingRecord.reloadList('someList', { reloadRecords: true });

    // then
    expect(listReloadSpy).to.have.been.calledOnce;
    expect(r1ReloadSpy, 'r1').to.have.been.calledOnce;
    expect(r2ReloadSpy, 'r2').to.have.been.calledOnce;
  });

  it('loadList: resolves when all records from list are loaded', async function () {
    // given
    const store = lookupService(this, 'store');
    registerListModel(this);
    const r1 = await store.createRecord('my-model', {}).save();
    const r2 = await store.createRecord('my-model', {}).save();
    const listRecord = await store.createRecord('list-model', { list: [r1, r2] }).save();
    r1.unloadRecord();
    r2.unloadRecord();
    // check just in case that records are unloaded
    expect(store.peekRecord('my-model', r1.id)).to.be.null;
    expect(store.peekRecord('my-model', r2.id)).to.be.null;
    const aggregatingRecord =
      await store.createRecord('aggregating-model', { someList: listRecord }).save();

    // when
    await aggregatingRecord.loadList('someList');

    // then
    expect(store.peekRecord('my-model', r1.id)).to.be.not.null;
    expect(store.peekRecord('my-model', r2.id)).to.be.not.null;
  });
});

function registerListModel(mochaContext) {
  const BaseModel = mochaContext.model;
  const owner = mochaContext.owner;
  class ListModel extends BaseModel {
    @hasMany('my-model') list;
  }
  class AggregatingModel extends BaseModel {
    @belongsTo('list-model') someList;
  }
  owner.register('model:list-model', ListModel);
  owner.register('model:aggregating-model', AggregatingModel);
}
