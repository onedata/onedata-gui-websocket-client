/**
 * Adds static fields and methods to Graphsync models.
 *
 * @author Michał Borzęcki
 * @copyright (C) 2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Mixin from '@ember/object/mixin';
import { getProperties } from '@ember/object';
import _ from 'lodash';

export default Mixin.create({
  /**
   * Returns requests, that should be settled before `operation` on `model`
   * will be started.
   * @param {Services.ActiveRequests} activeRequests
   * @param {string} operation one of: create, fetch, update, delete
   * @param {GraphModel} model
   * @returns {Array<Utils.Request>}
   */
  findBlockingRequests(activeRequests, operation /*, model*/ ) {
    const modelClassName = this.modelName;

    const {
      createRequests,
      fetchRequests,
      deleteRequests,
    } = getProperties(
      activeRequests,
      'createRequests',
      'fetchRequests',
      'deleteRequests'
    );

    switch (operation) {
      case 'create':
        {
          if (!_.endsWith(modelClassName, '-list')) {
            const modelListClassName = `${modelClassName}-list`;
            return fetchRequests.filterBy('modelClassName', modelListClassName);
          } else {
            return [];
          }
        }
      case 'fetch':
        {
          if (_.endsWith(modelClassName, '-list')) {
            const modelEntryClassName = modelClassName.slice(0, -5);
            return createRequests.concat(deleteRequests)
              .filterBy('modelClassName', modelEntryClassName);
          } else {
            return [];
          }
        }
      case 'update':
      case 'delete':
        return [];
    }
  },
});
