/**
 * Transforms strings
 * `file/dir/hardlink/symlink` (frontend) <-> `REG/DIR/LNK/SYMLNK` (backend).
 *
 * @module transforms/file-type
 * @author Michał Borzęcki
 * @copyright (C) 2021 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import DS from 'ember-data';
import _ from 'lodash';

const normalizedFileTypes = {
  REG: 'file',
  DIR: 'dir',
  LNK: 'hardlink',
  SYMLNK: 'symlink',
};
const defaultNormalizedFileType = 'file';

const serializedFileTypes = _.invert(normalizedFileTypes);
const defaultSerializedFileType = serializedFileTypes[defaultNormalizedFileType];

export default DS.Transform.extend({
  deserialize(serialized) {
    return normalizedFileTypes[serialized] || defaultNormalizedFileType;
  },

  serialize(deserialized) {
    return serializedFileTypes[deserialized] || defaultSerializedFileType;
  },
});