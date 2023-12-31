import { expect } from 'chai';
import { describe, it } from 'mocha';
import authHintGet from 'onedata-gui-websocket-client/utils/auth-hint-get';

describe('Unit | Utility | auth-hints', function () {
  const authHintGetCases = [
    ['group', 'users', 'throughGroup'],
    ['group', 'groups', 'throughGroup'],
    ['space', 'users', 'throughSpace'],
    ['space', 'groups', 'throughSpace'],
  ];

  // define 4 test - each for combination in authHintGetCases
  authHintGetCases.forEach(([parentType, collectionType, expectedResult]) => {
    it(
      `generates hint prefix for ${parentType} shared ${collectionType} list`,
      function () {
        const gid = `${parentType}.some_id.${collectionType}`;
        expect(
          authHintGet(gid),
          `input gid: ${gid}`,
        ).to.equal(expectedResult);
      });
  });
});
