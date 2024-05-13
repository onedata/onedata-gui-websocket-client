/* eslint-env node */
'use strict';

module.exports = function (environment, /* appConfig */ ) {
  const ENV = {
    environment,
    'ember-local-storage': {
      namespace: true,
    },
    'APP': {},
  };
  if (environment === 'test') {
    // ENV.APP.MOCK_BACKEND = true;
  }
  return ENV;
};
