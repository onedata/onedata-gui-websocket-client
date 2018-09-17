/**
 * A serializer that should be used for models that need authHint when finding
 * record.
 *
 * @module serializers/-context-collection
 * @author Jakub Liput, Michal Borzecki
 * @copyright (C) 2017-2018 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Serializer from 'onedata-gui-websocket-client/serializers/application';

import { inject } from '@ember/service';

export default Serializer.extend({
  onedataGraphContext: inject(),

  /**
   * @override Serializer#normalize by adding registration of list item context
   *   for further findRecord
   * @param {*} typeClass 
   * @param {*} hash 
   */
  normalize(typeClass, hash) {
    this.registerContextForItems(hash);
    return this._super(typeClass, hash);
  },

  /**
   * Registers context ("through what record should we ask for record?")
   * for each of elements of list of this raw record.
   * @param {Object} hash raw object returned from graph
   * @param {Array<string>} hash.list each element is a foreign key (GRI)
   * @returns {undefined}
   */
  registerContextForItems(hash) {
    const collectionList = hash.list;
    if (collectionList) {
      this.get('onedataGraphContext').registerArray(collectionList, hash.gri);
    }
  },
});
