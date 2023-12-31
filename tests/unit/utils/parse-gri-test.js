import { expect } from 'chai';
import { describe, it } from 'mocha';
import parseGri from 'onedata-gui-websocket-client/utils/parse-gri';

describe('Unit | Utility | parse-gri', function () {

  it('parses gri string', function () {
    const {
      entityType,
      entityId,
      aspect,
      scope,
    } = parseGri('oneentity.some_id.instance:protected');

    expect(entityType).to.equal('oneentity');
    expect(entityId).to.equal('some_id');
    expect(aspect).to.equal('instance');
    expect(scope).to.equal('protected');
  });

  it('parses gri string without aspect', function () {
    const {
      entityType,
      entityId,
      aspect,
      scope,
    } = parseGri('oneentity.some_id.instance');

    expect(entityType).to.equal('oneentity');
    expect(entityId).to.equal('some_id');
    expect(aspect).to.equal('instance');
    expect(scope).to.be.undefined;
  });

  it('parses gri string with aspect id', function () {
    const {
      entityType,
      entityId,
      aspect,
      aspectId,
      scope,
    } = parseGri('oneentity.some_id.some_aspect,aspect_id:private');

    expect(entityType).to.equal('oneentity');
    expect(entityId).to.equal('some_id');
    expect(aspect).to.equal('some_aspect');
    expect(aspectId).to.equal('aspect_id');
    expect(scope).to.equal('private');
  });
});
