/**
 * Mock of Onedata Websocket WebSocket API - Graph level service
 *
 * @module services/mocks/onedata-graph
 * @author Jakub Liput
 * @copyright (C) 2018 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Evented from '@ember/object/evented';
import { Promise } from 'rsvp';
import Service, { inject as service } from '@ember/service';
import parseGri from 'onedata-gui-websocket-client/utils/parse-gri';
import { get } from '@ember/object';

const messageNotSupported = Object.freeze({
  success: false,
  error: { id: 'notSupported' },
  data: {},
});

const responseDelay = 100;

export default Service.extend(Evented, {
  store: service(),
  currentUser: service(),

  /**
   * @param {string} gri
   * @param {string} operation one of: get, update, delete
   * @param {object} data
   * @param {[String,String]} authHint [HintType, Id of subject]
   * @param {string} [subscribe=false]
   * @returns {Promise<object, object>} resolves with Onedata Graph resource
   *   (typically record data)
   */
  request({
    gri,
    operation,
    data,
    authHint,
    // TODO: change to true if backend will be done
    subscribe = false,
  }) {
    console.debug(
      `Mock Graph request:
    - gri: ${gri},
    - operation: ${operation},
    - authHint: ${JSON.stringify(authHint || null)},
    - data: ${JSON.stringify(data || null)},
    - subscribe: ${subscribe}`
    );

    return new Promise(resolve => {
      setTimeout(
        () => resolve(
          this.response({
            gri,
            operation,
            data,
            authHint,
            subscribe,
          })),
        responseDelay
      );
    });
  },

  /**
   * @returns {Promise}
   */
  unsubscribe() {
    return new Promise(resolve => {
      setTimeout(
        () => resolve({
          success: true,
          error: null,
          data: {},
        }),
        responseDelay
      );
    });
  },

  scheduleUnsubscription() {
    return true;
  },

  response({
    gri,
    operation,
    data,
    authHint,
  }) {
    const {
      entityType,
      entityId,
      aspect,
    } = parseGri(gri);
    const handler = this.get(`handlers.${entityType}.${aspect}`);
    if (handler) {
      return Promise.resolve(
        handler.bind(this)(operation, entityId, data, authHint)
      );
    } else {
      return Promise.reject(messageNotSupported);
    }
  },

  handlers: Object.freeze({
    provider: {
      provider_registration_token(operation) {
        if (operation === 'create') {
          return {
            success: true,
            data: randomToken(),
          };
        } else {
          throw messageNotSupported;
        }
      },
      eff_users(operation, entityId) {
        if (operation === 'get') {
          return {
            gri: `provider.${entityId}.eff_users`,
            list: ['user1', 'user2'],
          };
        } else {
          throw messageNotSupported;
        }
      },
      eff_groups(operation, entityId) {
        if (operation === 'get') {
          return {
            gri: `provider.${entityId}.groups`,
            list: ['group1', 'group2', 'group3'],
          };
        } else {
          throw messageNotSupported;
        }
      },
      spaces(operation, entityId) {
        if (operation === 'get') {
          return {
            gri: `provider.${entityId}.spaces`,
            list: ['space1', 'space2', 'space3', 'space4'],
          };
        } else {
          throw messageNotSupported;
        }
      },
    },
    space: {
      invite_provider_token(operation, /* spaceId, data, authHint*/ ) {
        if (operation === 'create') {
          return {
            success: true,
            data: randomToken(),
          };
        } else {
          throw messageNotSupported;
        }
      },
    },
    harvester: {
      all_plugins(operation) {
        if (operation === 'get') {
          return {
            success: true,
            allPlugins: [{
              id: 'elasticsearch_plugin',
              name: 'Elasticsearch plugin',
            }],
          };
        } else {
          return messageNotSupported;
        }
      },
    },
    user: {
      client_tokens(operation) {
        if (operation === 'create') {
          const token = randomToken();
          return this.get('store')
            .createRecord('clientToken', {
              token,
            })
            .save()
            .then(clientToken => {
              const clientTokenId = get(clientToken, 'id');
              // real operation of adding token to list is server-side
              return this.get('currentUser')
                .getCurrentUserRecord()
                .then(user => get(user, 'clientTokenList'))
                .then(clientTokens => get(clientTokens, 'list'))
                .then(list => {
                  list.pushObject(clientToken);
                  return list.save();
                })
                .then(() => ({
                  success: true,
                  id: clientTokenId,
                  gri: clientTokenId,
                  token,
                }));
            });
        } else {
          return messageNotSupported;
        }
      },
      provider_registration_token(operation) {
        if (operation === 'create') {
          return randomToken();
        } else {
          return messageNotSupported;
        }
      },
    },
  }),
});

const exampleToken =
  'MDAxNWxvY2F00aW9uIG9uZXpvbmUKMDAzYmlkZW500aWZpZXIgM2E00NGx2bUM00cW5VcHAtSGx3X2NIZFhGT2ZJWXAwdG5Td1V5UEJ2LWtEMAowMDI4Y2lkIHRva2VuVHlwZSA9IHNwYWNlX3N1cHBvcnRfdG9rZW4KMDAyZnNpZ25hdHVyZSA6OiqbyenXe005Y4hXgbOYHgatNArPXTBCq01c4igkMrfAo';

/**
 * @returns {string}
 */
function randomToken() {
  const randInt = Math.floor(Math.random() * 10000);
  return exampleToken + randInt;
}
