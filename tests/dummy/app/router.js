import EmberRouter from '@ember/routing/router';
import config from './config/environment';

export default class Router extends EmberRouter {
  location = config.locationType;
  rootURL = config.rootURL;
}

// ESlint considers this method as Array.map, ignore it
/* eslint-disable array-callback-return */
Router.map(function () {
  this.route('login');
});
