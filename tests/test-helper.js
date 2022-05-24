import { start, setResolver } from 'ember-mocha';
import { setApplication } from '@ember/test-helpers';
import resolver from './helpers/resolver';
import Application from '../app';
import config from '../config/environment';

setResolver(resolver);
setApplication(Application.create(config.APP));

start();
