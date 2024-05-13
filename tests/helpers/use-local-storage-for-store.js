/**
 * Registers LocalStorage adapter and serializer to avoid using backend calls in tests.
 *
 * Typical usage in tests:
 *
 * ```js
 * const { beforeEach } = setupTest();
 * beforeEach() {
 *   useLocalStorageForStore(mochaContext.owner);
 * }
 * ```
 *
 * @author Jakub Liput
 * @copyright (C) 2024 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import LocalStorageAdapter from 'onedata-gui-websocket-client/adapters/local-storage';
import LocalStorageSerializer from 'ember-local-storage/serializers/serializer';

export default function useLocalStorageForStore(mochaContext) {
  mochaContext.owner.register('serializer:application', LocalStorageSerializer);
  mochaContext.owner.register('adapter:application', LocalStorageAdapter);
}
