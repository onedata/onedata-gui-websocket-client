/**
 * Adds properties and methods specific to single (non-list) models
 *
 * @module mixins/models/graph-single-model
 * @author Michal Borzecki
 * @copyright (C) 2018 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Mixin from '@ember/object/mixin';
import GraphModel from 'onedata-gui-websocket-client/mixins/models/graph-model';

export default Mixin.create(GraphModel, {
  didDelete() {
    this._super(...arguments);
    this.get('store').recalculateListsWithEntity(
      this.get('constructor.modelName'),
      this.get('entityId')
    );
  },
});
