/**
 * Fetches gui token, that can be used for authorization purposes.
 *
 * @module utils/get-gui-auth-token
 * @author Jakub Liput, Michał Borzęcki
 * @copyright (C) 2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import $ from 'jquery';
import { resolve } from 'rsvp';

export default function getToken() {
  return resolve($.post('./gui-preauthorize'))
    .then(({ token }) => token);
}
