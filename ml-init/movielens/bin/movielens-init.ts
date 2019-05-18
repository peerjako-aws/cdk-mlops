#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/cdk');
import { MovielensInitStack } from '../lib/movielens-init-stack';

const app = new cdk.App();
new MovielensInitStack(app, 'MovielensInitStack');
