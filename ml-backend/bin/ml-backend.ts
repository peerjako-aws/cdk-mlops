#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/cdk');
import { MlBackendStack } from '../lib/ml-backend-stack';

const app = new cdk.App();
new MlBackendStack(app, 'MlQABackendStack', {
    configFileName: 'configuration_qa.json'
});

new MlBackendStack(app, 'MlProdBackendStack', {
    configFileName: 'configuration_prod.json'
});
