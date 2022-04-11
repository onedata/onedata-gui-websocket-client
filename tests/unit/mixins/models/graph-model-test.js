import EmberObject from '@ember/object';
import { expect } from 'chai';
import { describe, it } from 'mocha';
import GraphModelMixin from 'onedata-gui-websocket-client/mixins/models/graph-model';

describe('Unit | Mixin | models/graph model', function () {
  it('has parsed gri computed properties', function () {
    const gri = 'aa.bb.cc,dd:ee';
    const GraphModelObject = EmberObject.extend(GraphModelMixin, {
      id: gri,
    });
    const subject = GraphModelObject.create();
    expect(subject.get('entityType')).to.equal('aa');
    expect(subject.get('entityId')).to.equal('bb');
    expect(subject.get('aspect')).to.equal('cc');
    expect(subject.get('aspectId')).to.equal('dd');
    expect(subject.get('scope')).to.equal('ee');
  });
});
