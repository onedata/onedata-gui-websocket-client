import { expect } from 'chai';
import { describe, it, context, beforeEach } from 'mocha';
import { setupTest } from 'ember-mocha';

describe('Unit | Transform | file type', function () {
  setupTest('transform:file-type', {
    // Specify the other units that are required for this test.
    // needs: ['transform:foo']
  });

  context('during serialization', function () {
    beforeEach(function () {
      this.convert = (...args) => this.subject().serialize(...args);
    });

    itConverts('file', 'REG');
    itConverts('dir', 'DIR');
    itConverts('hardlink', 'LNK');
    itConverts('symlink', 'SYMLNK');

    ['', 'sth', null].forEach(input =>
      itConverts(input, 'REG')
    );
  });

  context('during deserialization', function () {
    beforeEach(function () {
      this.convert = (...args) => this.subject().deserialize(...args);
    });

    itConverts('REG', 'file');
    itConverts('DIR', 'dir');
    itConverts('LNK', 'hardlink');
    itConverts('SYMLNK', 'symlink');

    ['', 'sth', null].forEach(input =>
      itConverts(input, 'file')
    );
  });
});

function itConverts(input, output) {
  it(`converts ${JSON.stringify(input)} to ${JSON.stringify(output)}`, function () {
    expect(this.convert(input)).to.equal(output);
  });
}
