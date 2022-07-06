import { start, setResolver } from 'ember-mocha';
import { afterEach } from 'mocha';
import { setApplication } from '@ember/test-helpers';
import resolver from './helpers/resolver';
import Application from '../app';
import config from '../config/environment';
import sinon from 'sinon';

setResolver(resolver);
setApplication(Application.create(config.APP));

afterEach(() => sinon.restore());

start();
