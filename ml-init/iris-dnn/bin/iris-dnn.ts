#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/cdk');
import { IrisDnnInitStack } from '../lib/iris-dnn-init-stack';

const app = new cdk.App();
new IrisDnnInitStack(app, 'IrisDnnInitStack');
