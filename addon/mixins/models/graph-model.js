/**
 * Adds convenience computed properties for desctructuring Graph Resource Identifier
 * from ID of records
 *
 * @author Jakub Liput, Michał Borzęcki
 * @copyright (C) 2017-2023 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import { oneWay, readOnly } from '@ember/object/computed';
import attr from 'ember-data/attr';
import Mixin from '@ember/object/mixin';
import { computed, observer } from '@ember/object';
import parseGri from 'onedata-gui-websocket-client/utils/parse-gri';
import { promise } from 'ember-awesome-macros';
import { defer } from 'rsvp';

export default Mixin.create({
  /**
   * If true, use subscribe option when getting or creating the record
   * @type {boolean}
   */
  isSubscribable: true,

  /**
   * @type {number}
   */
  revision: attr('number'),

  /**
   * @type {RSVP.Defer}
   */
  isLoadedDefer: undefined,

  /**
   * @type {boolean}
   */
  isForbidden: false,

  /**
   * @type {Ember.ComputedProperty<string>}
   */
  gri: oneWay('id'),

  /**
   * @type {Ember.ComputedProperty<object>}
   */
  parsedGri: computed('gri', function getParsedGri() {
    const gri = this.get('gri');
    if (gri) {
      return parseGri(gri);
    }
  }),

  /**
   * @type {Ember.ComputedProperty<string>}
   */
  entityType: readOnly('parsedGri.entityType'),

  /**
   * @type {Ember.ComputedProperty<string>}
   */
  entityId: readOnly('parsedGri.entityId'),

  /**
   * @type {Ember.ComputedProperty<string>}
   */
  aspect: readOnly('parsedGri.aspect'),

  /**
   * @type {Ember.ComputedProperty<string>}
   */
  aspectId: readOnly('parsedGri.aspectId'),

  /**
   * @type {Ember.ComputedProperty<string>}
   */
  scope: readOnly('parsedGri.scope'),

  /**
   * @type {Ember.ComputedProperty<object|undefined>}
   */
  forbiddenError: computed('isForbidden', function forbiddenError() {
    return this.get('isForbidden') ? { id: 'forbidden' } : undefined;
  }),

  /**
   * Resolves to true when record gets loaded (state changes to loaded).
   */
  isLoadedProxy: promise.object(computed('isLoadedDefer', function isLoadedProxy() {
    return this.get('isLoadedDefer').promise;
  })),

  isLoadedObserver: observer(
    'isLoaded',
    function isLoadedObserver() {
      if (this.get('isLoaded')) {
        this.isLoadedDefer.resolve(true);
      }
      this.notifyPropertyChange('isLoading');
    }
  ),

  isLoadingObserver: observer(
    'isLoading',
    'isReloading',
    function isLoadingObserver() {
      if (this.isForbidden) {
        this.set('isForbidden', false);
      }
    }
  ),

  reload() {
    return this._super(...arguments)
      .then(result => {
        if (this.get('isForbidden')) {
          this.set('isForbidden', false);
        }
        return result;
      });
  },

  /**
   * @override
   */
  unloadRecord() {
    const store = this.get('store');
    store.unsubscribeFromChanges(this);
    return this._super(...arguments);
  },

  init() {
    this._super(...arguments);
    this.set('isLoadedDefer', defer());
    // activate observer changing isLoadedProxy
    this.get('isLoaded');
  },
});
