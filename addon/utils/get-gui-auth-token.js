/**
 * Fetches gui token, that can be used for authorization purposes.
 *
 * @author Jakub Liput, Michał Borzęcki
 * @copyright (C) 2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

/**
 * @returns {Promise<{ token: string, ttl: number }>}
 */
export default async function getToken() {
  const response = await window.fetch('./gui-preauthorize', {
    method: 'POST',
  });
  let responseBody;
  try {
    responseBody = await response.json();
  } catch (error) {
    console.error('Cannot parse JSON from response due to error:', error);
  }

  if (response.ok) {
    return responseBody;
  } else if (!responseBody?.error && response.status === 401) {
    throw { id: 'unauthorized' };
  } else {
    throw responseBody?.error;
  }
}
