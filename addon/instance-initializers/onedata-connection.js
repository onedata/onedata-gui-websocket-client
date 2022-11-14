/**
 * Initializes onedata-connection service on application load.
 * Read more about why it's needed in onedata-connection service documentation.
 *
 * @author Michał Borzęcki
 * @copyright (C) 2022 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

export function initialize(appInstance) {
  appInstance.lookup('service:onedata-connection');
}

export default {
  initialize,
};
