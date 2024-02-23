/**
 * Returns true if this Web application is embedded in an iframe that is hosted on the
 * other origin than this app.
 *
 * @author Jakub Liput
 * @copyright (C) 2024 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

export default function isCrossOriginIframe() {
  let parentOrigin;
  try {
    parentOrigin = window.parent.location.origin;
  } catch {
    // getting parent origin means that it is blocked for security reasons
  }
  if (!parentOrigin) {
    return true;
  }
  return window.location.origin !== parentOrigin;
}
