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

export function getCoordinates(index, numberOfProviders) {
  const sign = index % 2 ? -1 : 1;
  if (index <= 2) {
    return [
      [50.065, 19.945],
      [48.865, 2.349],
      [38.737, -9.143],
    ][index];
  } else {
    return [
      ((180 / (numberOfProviders + 1)) * (index + 1) - 90) * sign,
      (360 / (numberOfProviders + 1)) * (index + 1) - 180,
    ];
  }
}
