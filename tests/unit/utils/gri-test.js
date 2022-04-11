import { expect } from 'chai';
import { describe, it } from 'mocha';
import gri from 'onedata-gui-websocket-client/utils/gri';

describe('Unit | Utility | gri', function () {
  it('allows to omit scope (old format)', function () {
    const result = gri('oneentity', 'oneid', 'oneaspect');
    expect(result).to.be.equal('oneentity.oneid.oneaspect:private');
  });
  it('still supports old signature of function', function () {
    const result = gri('oneentity', 'oneid', 'oneaspect', 'protected');
    expect(result).to.be.equal('oneentity.oneid.oneaspect:protected');
  });
  it('generates gri with aspectId', function () {
    const result = gri({
      entityType: 'oneentity',
      entityId: 'oneid',
      aspect: 'oneaspect',
      aspectId: 'secondid',
      scope: 'protected',
    });
    expect(result).to.be.equal('oneentity.oneid.oneaspect,secondid:protected');
  });
});
