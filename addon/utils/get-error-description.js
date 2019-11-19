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

const detailsTranslateFunctions = {
  posix: posixDetailsTranslator,
  badAudienceToken: nestedTokenErrorDetailsTranslator,
  badValueToken: nestedTokenErrorDetailsTranslator,
  notAnAccessToken: notAnAccessOrInviteTokenDetailsTranslator,
  notAnInviteToken: notAnAccessOrInviteTokenDetailsTranslator,
  tokenAudienceForbidden: tokenAudienceForbiddenDetailsError,
  inviteTokenConsumerInvalid: inviteTokenConsumerInvalidDetailsError,
};

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
    errorJsonString: stringifyError ? toFormattedJson(error) : undefined,
  };
}

function findTranslationForError(i18n, error) {
  const {
    id: errorId,
    details: errorDetails,
  } = getProperties(error, 'id', 'details');

  const detailsToTranslateFun = detailsTranslateFunctions[errorId];
  let errorDetailsToTranslate = detailsToTranslateFun ?
    detailsToTranslateFun(i18n, errorDetails) : errorDetails;

  return findTranslation(
    i18n,
    i18nPrefix + errorId,
    errorDetailsToTranslate
  );
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

function toFormattedJson(data) {
  if (!data) {
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

function posixDetailsTranslator(i18n, errorDetails) {
  const errnoTranslation =
    findTranslation(i18n, `${i18nPrefix}translationParts.posixErrno.${errorDetails.errno}`);
  return _.assign({}, errorDetails, { errno: errnoTranslation });
}

function nestedTokenErrorDetailsTranslator(i18n, errorDetails) {
  const tokenError = errorDetails.tokenError || {};
  const tokenErrorTranslation =
    findTranslation(i18n, i18nPrefix + tokenError.id, tokenError.details);
  return _.assign({}, errorDetails, { tokenError: tokenErrorTranslation });
}

function notAnAccessOrInviteTokenDetailsTranslator(i18n, errorDetails) {
  const receivedTranslation =
    findTokenTypeTranslation(i18n, errorDetails.received);
  return _.assign({}, errorDetails, { received: receivedTranslation });
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

function tokenAudienceForbiddenDetailsError(i18n, errorDetails) {
  const audience = errorDetails.audience || {};
  const audienceTranslation = resourceTypeAndIdToString(audience);
  return _.assign({}, errorDetails, { audience: audienceTranslation });
}

function inviteTokenConsumerInvalidDetailsError(i18n, errorDetails) {
  const consumer = errorDetails.consumer || {};
  const consumerTranslation = resourceTypeAndIdToString(consumer);
  return _.assign({}, errorDetails, { consumer: consumerTranslation });
}

function resourceTypeAndIdToString(resource) {
  return `${resource.type}:${resource.id}`;
}
