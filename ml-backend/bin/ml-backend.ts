#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/cdk');
import { MlBackendStack } from '../lib/ml-backend-stack';
import { MlAPIGWStack } from '../lib/ml-apigw-stack';

const app = new cdk.App();
new MlBackendStack(app, 'MlQABackendStack', {
    configFileName: 'configuration_qa.json'
});

new MlBackendStack(app, 'MlProdBackendStack', {
    configFileName: 'configuration_prod.json'
});

new MlAPIGWStack(app, 'MlQAAPIGWStack', {
    endpointSSMParamName: 'qa-IrisDnnPipelineStack-endpoint'
});
