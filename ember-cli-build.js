/* eslint-env node */
'use strict';

const EmberAddon = require('ember-cli/lib/broccoli/ember-addon');

module.exports = function (defaults) {
  // BUGFIX Fixes stopping `ember serve` after any build error. Fix based on
  // ember-cli issue https://github.com/ember-cli/ember-cli/issues/9404.
  // It's already fixed by https://github.com/ember-cli/ember-cli/pull/9987
  // in the 4.8 ember-cli release
  // https://github.com/ember-cli/ember-cli/releases/tag/v4.8.0.
  // TODO: VFS-11893 Remove this hack.
  process.on('uncaughtException', function (error) {
    console.error(error.stack);
    console.log('Not allowing node to exit after build error.');
  });

  const app = new EmberAddon(defaults, {
    // Add options here
  });

  /*
    This build file specifies the options for the dummy test app of this
    addon, located in `/tests/dummy`
    This build file does *not* influence how the addon or the app using it
    behave. You most likely want to be modifying `./index.js` or app's build file
  */

  return app.toTree();
};
