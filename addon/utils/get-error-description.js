/**
 * Unpack string with error from backend rejected request
 *
 * @module utils/get-error-description
 * @author Michał Borzęcki
 * @copyright (C) 2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import { htmlSafe, isHTMLSafe } from '@ember/string';
import { getProperties } from '@ember/object';
import Ember from 'ember';
import _ from 'lodash';

const i18nPrefix = 'errors.backendErrors.';

/**
 * Gets error details from error object that is returned on websocket backend
 * reject.
 *
 * @export
 * @param {object} error
 * @param {object} i18n
 * @return {object}
 */
export default function getErrorDescription(error, i18n) {
  let message;
  let stringifyError = false;

  if (typeof error === 'object' && error.id) {
    message = findTranslationForError(i18n, error);
    stringifyError = true;
  } else if (typeof error === 'object' && error.message) {
    message = error.message;
  } else if (isHTMLSafe(error)) {
    message = error;
  } else {
    stringifyError = true;
  }

  return {
    message: toPrintableString(message),
    errorJsonString: stringifyError ? toPrintableJson(error) : undefined,
  };
}

function findTranslationForError(i18n, error) {
  const {
    id: errorId,
    details: errorDetails,
  } = getProperties(error, 'id', 'details');

  let errorIdToTranslate = errorId;
  let errorDetailsToTranslate = errorDetails;

  // Errors with non-standard translation method
  switch(errorId) {
    case 'posix': {
      const errnoTranslation =
        findTranslation(i18n, `${i18nPrefix}translationParts.posixErrno.${errorDetails.errno}`);
      errorDetailsToTranslate = _.assign({}, errorDetails, {
        errno: errnoTranslation,
      });
      break;
    }
    case 'badAudienceToken':
    case 'badValueToken': {
      const tokenError = errorDetails.tokenError || {};
      const tokenErrorTranslation =
        findTranslation(i18n, i18nPrefix + tokenError.id, tokenError.details);
      errorDetailsToTranslate = _.assign({}, errorDetails, {
        tokenError: tokenErrorTranslation,
      });
      break;
    }
    case 'notAnAccessToken': {
      const receivedTranslation =
        findTokenTypeTranslation(i18n, errorDetails.received);
      errorDetailsToTranslate = _.assign({}, errorDetails, {
        received: receivedTranslation,
      });
      break;
    }
    case 'notAnInviteToken': {
      const expectedTranslation =
        findTokenTypeTranslation(i18n, errorDetails.expected);
      const receivedTranslation =
        findTokenTypeTranslation(i18n, errorDetails.received);
      errorDetailsToTranslate = _.assign({}, errorDetails, {
        expected: expectedTranslation,
        received: receivedTranslation,
      });
      break;
    }
    case 'tokenAudienceForbidden': {
      const audience = errorDetails.audience || {};
      const audienceTranslation = `${audience.type}:${audience.id}`;
      errorDetailsToTranslate = _.assign({}, errorDetails, {
        audience: audienceTranslation,
      });
      break;
    }
  }

  return findTranslation(
    i18n,
    i18nPrefix + errorIdToTranslate,
    errorDetailsToTranslate
  );
}

function findTokenTypeTranslation(i18n, tokenType) {
  let translation = '';
  if (tokenType.accessToken) {
    translation =
      findTranslation(i18n, i18nPrefix + 'translationParts.accessToken');
  } else if (tokenType.inviteToken) {
    translation =
      tokenType.inviteToken.subtype + ' ' +
      findTranslation(i18n, i18nPrefix + 'translationParts.inviteToken');
  }
  return translation;
}

function findTranslation(i18n, key, placeholders) {
  const translation = i18n.t(key, placeholders);
  const translationAsString = translation ? translation.toString() : '';
  return (!translationAsString || translationAsString.startsWith('<missing-')) ?
    undefined : translation;
}

function toPrintableString(string) {
  return string && string.toString() ?
    htmlSafe(Ember.Handlebars.Utils.escapeExpression(string)) : undefined;
}

function toPrintableJson(data) {
  if (data === null || data === undefined || data === '') {
    return undefined;
  } else {
    try {
      const stringifiedJson = JSON.stringify(data, null, 2);
      return htmlSafe(
        `<code>${Ember.Handlebars.Utils.escapeExpression(stringifiedJson)}</code>`
      );
    } catch (e) {
      return undefined;
    }
  }
}
