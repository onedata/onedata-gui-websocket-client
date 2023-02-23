import { expect } from 'chai';
import { describe, it } from 'mocha';
import spacePrivilegesFlags from 'onedata-gui-websocket-client/utils/space-privileges-flags';

describe('Unit | Utility | space-privileges-flags', function () {
  it('exports flat flags array containing transfer and qos management flags', function () {
    [
      'space_view_transfers',
      'space_schedule_replication',
      'space_cancel_replication',
      'space_schedule_eviction',
      'space_cancel_eviction',
      'space_view_qos',
      'space_manage_qos',
    ].forEach(flag => {
      expect(spacePrivilegesFlags, spacePrivilegesFlags.join(',')).to.contain(flag);
    });
  });
});
