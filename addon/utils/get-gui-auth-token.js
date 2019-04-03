/**
 * Fetches gui token, that can be used for authorization purposes.
 *
 * @module utils/get-gui-auth-token
 * @author Jakub Liput, Michał Borzęcki
 * @copyright (C) 2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import $ from 'jquery';

export default function getToken() {
  return new Promise((resolve, reject) => $.ajax('/gui-token', {
      method: 'POST',
      contentType: 'application/json; charset=utf-8',
      dataType: 'json',
      data: JSON.stringify({
        clusterId: 'onezone',
        clusterType: 'onezone',
      }),
    }).then(resolve, reject))
    .then(({ token }) => token);
}
