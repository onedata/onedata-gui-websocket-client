/**
 * Adds mocked model generation step on `beforeModel` hook
 *
 * Do not forget to implement virtual functions!
 *
 * May be parametrized using developmentModelConfig property, which format is:
 * {
 *   clearOnReload {boolean} if true, model will be recreated on each page reload
 * }
 *
 * @author Jakub Liput, Michał Borzęcki
 * @copyright (C) 2017 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 *
 * @abstract
 */

import Mixin from '@ember/object/mixin';
import _ from 'lodash';
import config from 'ember-get-config';
import {
  isDevelopment,
  isModelMocked,
} from 'onedata-gui-websocket-client/utils/development-environment';
import { resolve } from 'rsvp';

// Default developmentModelConfig
const defaultConfig = {
  clearOnReload: true,
};

export default Mixin.create({
  /**
   * @virtual
   * @type {string}
   */
  clearLocalStoragePrefix: '',

  /**
   * @type {object} Ember Config (eg. ember-get-config)
   */
  envConfig: config,

  /**
   * @type {Function}
   */
  isDevelopment,

  /**
   * @type {Function}
   */
  isModelMocked,

  /**
   * Configuration object for model.
   * @virtual
   * @type {object}
   */
  developmentModelConfig: Object.freeze({}),

  /**
   * @type {Storage}
   */
  localStorage,

  /**
   * @virtual
   * @returns {Promise<undefined, any>}
   */
  generateDevelopmentModel() {
    throw new Error(
      'route:<development-model-mixin>: generateDevelopmentModel not implemented'
    );
  },

  /**
   * @virtual
   * @returns {Promise<undefined, any>}
   */
  clearDevelopmentModel() {
    const clearLocalStoragePrefix = this.get('clearLocalStoragePrefix');
    const localStorageLength = this.localStorage.length;
    const keysToRemove = [];
    for (let i = 0; i < localStorageLength; ++i) {
      const key = this.localStorage.key(i);
      if (key.startsWith(clearLocalStoragePrefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => this.localStorage.removeItem(key));
    return resolve();
  },

  beforeModel() {
    this._super(...arguments);
    const {
      store,
      envConfig,
      developmentModelConfig,
    } = this.getProperties('store', 'envConfig', 'developmentModelConfig');
    if (this.isDevelopment(envConfig)) {
      const config = this._getDevelopmentModelConfig();
      const clearPromise = config.clearOnReload ?
        this.clearDevelopmentModel(store) : resolve();
      return clearPromise.then(() =>
        this.isModelMocked(store).then(isMocked => {
          if (isMocked) {
            console.debug(
              'route:application: development environment, model already mocked'
            );
            return resolve();
          } else {
            return this.generateDevelopmentModel(store, developmentModelConfig);
          }
        })
      );
    } else {
      return resolve();
    }
  },

  /**
   * Fills in developmentModelConfig with default data (if it is empty or
   * partially filled) and returns valid config.
   * @returns {Object}
   */
  _getDevelopmentModelConfig() {
    const config = _.assign({}, this.get('developmentModelConfig') || {});
    Object.keys(defaultConfig).forEach((key) => {
      if (config[key] === undefined) {
        config[key] = defaultConfig[key];
      }
    });
    return config;
  },
});
