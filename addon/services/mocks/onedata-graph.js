/**
 * Mock of Onedata Websocket WebSocket API - Graph level service
 *
 * @module services/mocks/onedata-graph
 * @author Jakub Liput
 * @copyright (C) 2018-2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Evented from '@ember/object/evented';
import { Promise } from 'rsvp';
import Service, { inject as service } from '@ember/service';
import parseGri from 'onedata-gui-websocket-client/utils/parse-gri';
import { v4 as uuid } from 'ember-uuid';

export const messageNotSupported = Object.freeze({
  success: false,
  error: { id: 'notSupported' },
  data: {},
});

export const exampleToken =
  'MDAxNWxvY2F00aW9uIG9uZXpvbmUKMDAzYmlkZW500aWZpZXIgM2E00NGx2bUM00cW5VcHAtSGx3X2NIZFhGT2ZJWXAwdG5Td1V5UEJ2LWtEMAowMDI4Y2lkIHRva2VuVHlwZSA9IHNwYWNlX3N1cHBvcnRfdG9rZW4KMDAyZnNpZ25hdHVyZSA6OiqbyenXe005Y4hXgbOYHgatNArPXTBCq01c4igkMrfAo';

/**
 * @returns {string}
 */
export function randomToken() {
  const randInt = Math.floor(Math.random() * 10000);
  return exampleToken + randInt;
}

const responseDelay = 100;

const spaceHandlers = {
  view(operation, /* entityId, data, authHint */ ) {
    if (operation !== 'get') {
      return messageNotSupported;
    }
    return {
      viewOptions: {
        hello: 'world',
        foo: 'bar',
      },
      spatial: false,
      revision: 1,
      reduceFunction: null,
      providers: [
        'oneprovider-1',
        'oneprovider-2',
      ],
      mapFunction: 'function (id, type, meta, ctx) {    if (type === \\"custom_metadata\\"){        if (meta[\\"license\\"]) {            return [meta[\\"license\\"], id];        }    }}',
      indexOptions: {
        lorem: 'ipsum',
      },
      gri: 'op_space.efd6e203d35061d5bef37a7e1636e8bbip2d5571458.view,test6:private',
    };
  },
};

// TODO: move Onezone-only methods to Onezone onedata-graph mock

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
    const id = uuid();
    console.debug(
      `Mock Graph request:
    - uuid: ${id}
    - gri: ${gri},
    - operation: ${operation},
    - authHint: ${JSON.stringify(authHint || null)},
    - data: ${JSON.stringify(data || null)},
    - subscribe: ${subscribe}`
    );

    return new Promise(resolve => {
      setTimeout(
        () => {
          const response = this.response({
            gri,
            operation,
            data,
            authHint,
            subscribe,
          });
          console.debug(`Mock Graph response ${id}: ${JSON.stringify(response)}`);
          return resolve(response);
        },
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
    provider: providerHandlers,
    space: spaceHandlers,
  }),
});

const providerHandlers = {
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
