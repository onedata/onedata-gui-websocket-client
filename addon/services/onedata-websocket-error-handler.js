/**
 * Abstract implementation of handling errors and abnormal close of WebSocket
 * connection. It should be extended to provide GUI information about error
 * and reconnection.
 * 
 * @module services/onedata-websocket-error-handler
 * @author Jakub Liput
 * @copyright (C) 2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Service, { inject as service } from '@ember/service';
import OnedataWebsocketUtils from 'onedata-gui-websocket-client/mixins/onedata-websocket-utils';

export default Service.extend(OnedataWebsocketUtils, {
  onedataWebsocket: service(),
  session: service(),

  /**
   * Invoked when WebSocket `onclose` is invoked unexpectedly (without explicit
   * close by user).
   * @param {CloseEvent} closeEvent 
   * @param {boolean} openingCompleted true if `onclose` was invoked after
   *  the WebSocket `onopen` handler was invoked; false typically means
   *  that the connection was closed without open (opening failed)
   * @returns {Promise<any>|undefined} by default tries to reconnect
   */
  abnormalClose(closeEvent, openingCompleted) {
    console.warn(
      `service:onedata-websocket-error-handler#abnormalClose: WS close not invoked by user, code: ${closeEvent.code}, WS was ${openingCompleted ? 'opened' : 'NOT opened'}; reconnecting...`
    );
    return this.reconnect()
      .then(() => {
        console.debug(
          'service:onedata-websocket-error-handler#abnormalClose: WS has been reconnected successfully'
        );
      })
      .catch(error => {
        console.warn(
          `service:onedata-websocket-error-handler#abnormalClose: WS reconnection error: ${error && error.toString()}`
        );
        throw error;
      });
  },

  /**
   * Invoked when WebSocket `onerror` occures. It is probably unrecoverable, so
   * only error message should be presented.
   * @param {any} errorEvent
   * @returns {undefined}
   */
  errorOccured(errorEvent) {
    console.warn(
      `service:onedata-websocket-error-handler#abnormalClose: WS error: ${errorEvent && errorEvent.toString()}`
    );
  },

  reconnect() {
    const isAuthenticated = this.get('session.isAuthenticated');
    return this.forceCloseConnection()
      .then(() =>
        this.initWebSocketConnection(isAuthenticated ? 'authenticated' : 'anonymous')
      );
  },
});
