/**
 * Common functions for generating development model for any service
 * 
 * @module utils/development-model-common
 * @author Jakub Liput
 * @copyright (C) 2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

export function generateSpaceEntityId(spaceNumber) {
  return `space-${spaceNumber}`;
}
