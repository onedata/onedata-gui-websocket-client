/**
 * Transforms strings
 * `file/dir/hardlink/symlink` (frontend) <-> `REG/DIR/LNK/SYMLNK` (backend).
 *
 * @author Michał Borzęcki
 * @copyright (C) 2021 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Transform from '@ember-data/serializer/transform';
import _ from 'lodash';

export const normalizedFileTypes = {
  REG: 'file',
  DIR: 'dir',
  LNK: 'hardlink',
  SYMLNK: 'symlink',
};
const defaultNormalizedFileType = 'file';

export const serializedFileTypes = _.invert(normalizedFileTypes);
const defaultSerializedFileType = serializedFileTypes[defaultNormalizedFileType];

export default Transform.extend({
  deserialize(serialized) {
    return normalizedFileTypes[serialized] || defaultNormalizedFileType;
  },

  serialize(deserialized) {
    return serializedFileTypes[deserialized] || defaultSerializedFileType;
  },
});
