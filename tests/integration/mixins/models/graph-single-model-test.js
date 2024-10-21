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

});
