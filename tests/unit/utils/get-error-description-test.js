import { expect } from 'chai';
import { describe, it, beforeEach } from 'mocha';
import getErrorDescription from 'onedata-gui-websocket-client/utils/get-error-description';
import sinon from 'sinon';
import { htmlSafe } from '@ember/string';
import Ember from 'ember';

describe('Unit | Utility | get error description', function () {
  beforeEach(function () {
    this.i18n = new I18nStub();
  });

  it('handles errors in form { id, details }', function () {
    const errorDetails = { a: 1 };
    const testTranslation = 'translation';
    sinon.stub(this.i18n, 't')
      .withArgs('errors.backendErrors.someError', errorDetails)
      .returns(testTranslation);
    const error = {
      id: 'someError',
      details: errorDetails,
    };

    const result = getErrorDescription(error, this.i18n);

    expect(result).to.deep.equal({
      message: escapedHtmlSafe(testTranslation),
      errorJsonString: escapedJsonHtmlSafe(error),
    });
  });

  it('handles errors in form { id, details } when id is not recognized', function () {
    const errorDetails = { a: 1 };
    sinon.stub(this.i18n, 't')
      .withArgs('errors.backendErrors.someError', errorDetails)
      .returns('<missing-...');
    const error = {
      id: 'someError',
      details: errorDetails,
    };

    const result = getErrorDescription(error, this.i18n);

    expect(result).to.deep.equal({
      message: undefined,
      errorJsonString: escapedJsonHtmlSafe(error),
    });
  });

  it('handles errors in form { id, details } when JSON cannot be stringified',
    function () {
      const testTranslation = 'translation';
      const error = {
        id: 'someError',
        details: {},
      };
      // Circular structure which cannot be stringified
      error.details = error;
      sinon.stub(this.i18n, 't')
        .withArgs('errors.backendErrors.someError', error.details)
        .returns(testTranslation);

      const result = getErrorDescription(error, this.i18n);

      expect(result).to.deep.equal({
        message: escapedHtmlSafe(testTranslation),
        errorJsonString: undefined,
      });
    });

  it('handles errors in form { message }', function () {
    const error = { message: 'someError' };

    const result = getErrorDescription(error, this.i18n);

    expect(result).to.deep.equal({
      message: escapedHtmlSafe(error.message),
      errorJsonString: undefined,
    });
  });

  it('handles errors inside htmlSafe', function () {
    const testTranslation = 'translation';
    const error = htmlSafe(testTranslation);

    const result = getErrorDescription(error, this.i18n);

    expect(result).to.deep.equal({
      message: escapedHtmlSafe(testTranslation),
      errorJsonString: undefined,
    });
  });

  it('handles non-standard object errors', function () {
    const error = { err: 'error' };

    const result = getErrorDescription(error, this.i18n);

    expect(result).to.deep.equal({
      message: undefined,
      errorJsonString: escapedJsonHtmlSafe(error),
    });
  });

  it('handles non-standard object errors with circular relations', function () {
    const error = {};
    error.err = error;

    const result = getErrorDescription(error, this.i18n);

    expect(result).to.deep.equal({
      message: undefined,
      errorJsonString: undefined,
    });
  });

  it('handles errors in form { id, details } with id == "posix"', function () {
    sinon.stub(this.i18n, 't')
      .withArgs('errors.backendErrors.posix', { errno: 'enoent error' })
      .returns('complete enoent error')
      .withArgs('errors.backendErrors.translationParts.posixErrno.enoent')
      .returns('enoent error');
    const error = {
      id: 'posix',
      details: { errno: 'enoent' },
    };

    const result = getErrorDescription(error, this.i18n);

    expect(result).to.deep.equal({
      message: escapedHtmlSafe('complete enoent error'),
      errorJsonString: escapedJsonHtmlSafe(error),
    });
  });

  it(
    'handles errors in form { id, details } with id == "posix" and unknown errno',
    function () {
      const error = {
        id: 'posix',
        details: { errno: 'something' },
      };

      const result = getErrorDescription(error, this.i18n);

      expect(result).to.deep.equal({
        message: undefined,
        errorJsonString: escapedJsonHtmlSafe(error),
      });
    }
  );

  [
    'badAudienceToken',
    'badValueToken',
  ].forEach(errorId => {
    it(`handles errors in form { id, details } with id == "${errorId}"`,
      function () {
        const nestedErrorDetails = {
          limit: 120,
        };
        const nestedError = {
          id: 'tokenTooLarge',
          details: nestedErrorDetails,
        };
        sinon.stub(this.i18n, 't')
          .withArgs(
            `errors.backendErrors.${errorId}`,
            sinon.match({ tokenError: 'token too large' })
          ).returns('complete error')
          .withArgs(
            'errors.backendErrors.tokenTooLarge',
            nestedErrorDetails
          ).returns('token too large');
        const error = {
          id: errorId,
          details: {
            tokenError: nestedError,
          },
        };

        const result = getErrorDescription(error, this.i18n);

        expect(result).to.deep.equal({
          message: escapedHtmlSafe('complete error'),
          errorJsonString: escapedJsonHtmlSafe(error),
        });
      });
  });

  it(
    'handles errors in form { id, details } with id == "notAnAccessToken" and received with "accessToken"',
    function () {
      const tStub = sinon.stub(this.i18n, 't')
        .withArgs(
          'errors.backendErrors.notAnAccessToken',
          sinon.match({ received: 'access token' })
        ).returns('complete error');
      stubAccessTokenTypeTranslation(tStub);
      const error = {
        id: 'notAnAccessToken',
        details: {
          received: {
            accessToken: {},
          },
        },
      };

      const result = getErrorDescription(error, this.i18n);

      expect(result).to.deep.equal({
        message: escapedHtmlSafe('complete error'),
        errorJsonString: escapedJsonHtmlSafe(error),
      });
    }
  );

  it(
    'handles errors in form { id, details } with id == "notAnAccessToken" and received with "inviteToken"',
    function () {
      const tStub = sinon.stub(this.i18n, 't')
        .withArgs(
          'errors.backendErrors.notAnAccessToken',
          sinon.match({ received: 'userJoinSpace invite token' })
        ).returns('complete error');
      stubInviteTokenTypeTranslation(tStub);
      const error = {
        id: 'notAnAccessToken',
        details: {
          received: {
            inviteToken: {
              subtype: 'userJoinSpace',
            },
          },
        },
      };

      const result = getErrorDescription(error, this.i18n);

      expect(result).to.deep.equal({
        message: escapedHtmlSafe('complete error'),
        errorJsonString: escapedJsonHtmlSafe(error),
      });
    }
  );

  it(
    'handles errors in form { id, details } with id == "notAnInviteToken", expected with "userJoinSpace" and received with "inviteToken"',
    function () {
      const tStub = sinon.stub(this.i18n, 't')
        .withArgs(
          'errors.backendErrors.notAnInviteToken',
          sinon.match({
            expectedInviteTokenType: 'userJoinSpace',
            received: 'groupJoinSpace invite token',
          })
        ).returns('complete error');
      stubAccessTokenTypeTranslation(tStub);
      stubInviteTokenTypeTranslation(tStub);
      const error = {
        id: 'notAnInviteToken',
        details: {
          expectedInviteTokenType: 'userJoinSpace',
          received: {
            inviteToken: {
              subtype: 'groupJoinSpace',
            },
          },
        },
      };

      const result = getErrorDescription(error, this.i18n);

      expect(result).to.deep.equal({
        message: escapedHtmlSafe('complete error'),
        errorJsonString: escapedJsonHtmlSafe(error),
      });
    }
  );

  it(
    'handles errors in form { id, details } with id == "notAnInviteToken", expected with "userJoinSpace" and received with "accessToken"',
    function () {
      const tStub = sinon.stub(this.i18n, 't')
        .withArgs(
          'errors.backendErrors.notAnInviteToken',
          sinon.match({
            expectedInviteTokenType: 'userJoinSpace',
            received: 'access token',
          })
        ).returns('complete error');
      stubAccessTokenTypeTranslation(tStub);
      stubInviteTokenTypeTranslation(tStub);
      const error = {
        id: 'notAnInviteToken',
        details: {
          expectedInviteTokenType: 'userJoinSpace',
          received: {
            accessToken: {},
          },
        },
      };

      const result = getErrorDescription(error, this.i18n);

      expect(result).to.deep.equal({
        message: escapedHtmlSafe('complete error'),
        errorJsonString: escapedJsonHtmlSafe(error),
      });
    }
  );

  [{
    id: 'tokenAudienceForbidden',
    resourceFieldName: 'audience',
  }, {
    id: 'inviteTokenConsumerInvalid',
    resourceFieldName: 'consumer',
  }].forEach(({ id, resourceFieldName }) => {
    it(
      `handles errors in form { id, details } with id == "${id}"`,
      function () {
        sinon.stub(this.i18n, 't')
          .withArgs(`errors.backendErrors.${id}`, {
            [resourceFieldName]: 'user:123',
          }).returns('complete error');
        const error = {
          id,
          details: {
            [resourceFieldName]: {
              type: 'user',
              id: '123',
            },
          },
        };

        const result = getErrorDescription(error, this.i18n);

        expect(result).to.deep.equal({
          message: escapedHtmlSafe('complete error'),
          errorJsonString: escapedJsonHtmlSafe(error),
        });
      }
    );
  });
});

function stubInviteTokenTypeTranslation(tStub) {
  return tStub
    .withArgs('errors.backendErrors.translationParts.inviteToken')
    .returns('invite token');
}

function stubAccessTokenTypeTranslation(tStub) {
  return tStub
    .withArgs('errors.backendErrors.translationParts.accessToken')
    .returns('access token');
}

function escapedHtmlSafe(content) {
  return htmlSafe(Ember.Handlebars.Utils.escapeExpression(content));
}

function escapedJsonHtmlSafe(content) {
  const stringifiedJson = JSON.stringify(content, null, 2);
  return htmlSafe(
    `<code>${Ember.Handlebars.Utils.escapeExpression(stringifiedJson)}</code>`
  );
}

class I18nStub {
  t() {}
}
