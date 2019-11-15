/**
 * Mock of Onedata Websocket WebSocket API - Graph level service
 *
 * @module services/mocks/onedata-graph
 * @author Jakub Liput
 * @copyright (C) 2018 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

// FIXME: move specific methods to oneprovider-gui and onezone-gui

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

const spaceHandlers = {
  invite_provider_token(operation, /* spaceId, data, authHint*/ ) {
    if (operation === 'create') {
      return {
        success: true,
        data: randomToken(),
      };
    } else {
      return messageNotSupported;
    }
  },
  transfers(operation, entityId, data) {
    if (operation !== 'get') {
      return messageNotSupported;
    }
    const allTransfers = this.get('mockBackend.entityRecords.transfer');
    const {
      state,
      offset,
      limit,
      page_token: index,
    } = data;
    let griList = allTransfers.filterBy('state', state).mapBy('id');
    let startPosition =
      Math.max(griList.findIndex(t => get(t, 'index') === index), 0);
    startPosition = Math.max(startPosition + offset, 0);
    griList = griList.slice(startPosition, startPosition + limit);
    return {
      list: griList,
    };
  },
  transfers_throughput_charts(operation /*, entityId, data*/ ) {
    if (operation !== 'get') {
      return messageNotSupported;
    }
    const allProviders = this.get('mockBackend.entityRecords.provider');
    const firstProviderId = get(allProviders[0], 'entityId');
    return {
      timestamp: 1572261964,
      inputCharts: {
        [firstProviderId]: [
          1365758,
          1365758,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
        ],
      },
      outputCharts: {
        [firstProviderId]: [
          1365758,
          1365758,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
        ],
      },
    };
  },
  transfers_active_channels(operation) {
    if (operation !== 'get') {
      return messageNotSupported;
    }
    const allProviders = this.get('mockBackend.entityRecords.provider');
    const firstProviderId = get(allProviders[0], 'entityId');
    const secondProviderId = get(allProviders[1], 'entityId');
    const thirdProviderId = get(allProviders[2], 'entityId');
    return {
      channelDestinations: {
        [firstProviderId]: [secondProviderId],
        [thirdProviderId]: [secondProviderId],
      },
    };
  },
};

const transferStatusToProgressState = {
  waiting: 'scheduled',
  ongoing: 'replicating',
  ended: 'ended',
};

const harvesterHandlers = {
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
};

const userHandlers = {
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
};

const transferHandlers = {
  throughput_charts(operation /*, entityId, data*/ ) {
    if (operation !== 'get') {
      return messageNotSupported;
    }
    const allProviders = this.get('mockBackend.entityRecords.provider');
    const firstProviderId = get(allProviders[0], 'entityId');
    return {
      timestamp: 1572261964,
      charts: {
        [firstProviderId]: [
          1365758,
          1365758,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
        ],
      },
    };
  },
  progress(operation, entityId) {
    if (operation !== 'get') {
      return messageNotSupported;
    }
    const allTransfers = this.get('mockBackend.entityRecords.transfer');
    const transfer = allTransfers.findBy('entityId', entityId);
    const status = transferStatusToProgressState[get(transfer, 'state')] || 'failed';
    return {
      status,
      timestamp: Math.floor(Date.now() / 1000),
      replicatedBytes: Math.pow(1024, 3),
      replicatedFiles: 14,
      evictedFiles: 0,
    };
  },
  rerun(operation /*, entityId, data*/ ) {
    if (operation !== 'create') {
      return messageNotSupported;
    }
    // TODO: complete the mock: change status of transfer to reruned
    return null;
  },
  instance(operation /*, entityId, data*/ ) {
    if (operation !== 'delete') {
      return messageNotSupported;
    }
    // TODO: complete the mock: change status of transfer to cancelled
    return null;
  },
};

const fileHandlers = {
  transfers(operation, entityId, data) {
    if (operation !== 'get') {
      return messageNotSupported;
    }
    const {
      include_ended_list: includeEndedList,
    } = data;
    const fileTransfers = this.get('mockBackend.entityRecords.transfer')
      .filterBy('dataSourceId', entityId);
    const ongoingList = fileTransfers
      .filter(t => get(t, 'state') !== 'ended')
      .mapBy('id');
    const endedList = fileTransfers
      .filter(t => get(t, 'state') === 'ended')
      .mapBy('id');
    const response = {
      ongoingList,
      endedCount: get(endedList, 'length'),
    };
    if (includeEndedList) {
      response.endedList = endedList;
    }
    return response;
  },
};

export default Service.extend(Evented, {
  store: service(),
  currentUser: service(),
  mockBackend: service(),

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
    op_provider: providerHandlers,
    op_space: spaceHandlers,
    harvester: harvesterHandlers,
    op_user: userHandlers,
    op_transfer: transferHandlers,
    file: fileHandlers,
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

const providerHandlers = {
  eff_users(operation, entityId) {
    if (operation === 'get') {
      return {
        gri: `provider.${entityId}.eff_users`,
        list: ['user1', 'user2'],
      };
    } else {
      return messageNotSupported;
    }
  },
  eff_groups(operation, entityId) {
    if (operation === 'get') {
      return {
        gri: `provider.${entityId}.groups`,
        list: ['group1', 'group2', 'group3'],
      };
    } else {
      return messageNotSupported;
    }
  },
  spaces(operation, entityId) {
    if (operation === 'get') {
      return {
        gri: `provider.${entityId}.spaces`,
        list: ['space1', 'space2', 'space3', 'space4'],
      };
    } else {
      return messageNotSupported;
    }
  },
};
