#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/cdk');
import { MlPipelineStack } from '../lib/ml-pipeline-stack';

const app = new cdk.App();
new MlPipelineStack(app, 'MovielensPipelineStack', {
    mlProject: 'movielens'
});

new MlPipelineStack(app, 'IrisDnnPipelineStack', {
    mlProject: 'iris-dnn'
});