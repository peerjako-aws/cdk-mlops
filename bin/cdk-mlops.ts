#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/cdk');
import { CdkMlopsStack } from '../lib/cdk-mlops-stack';

const app = new cdk.App();
new CdkMlopsStack(app, 'CdkMlopsStack');
