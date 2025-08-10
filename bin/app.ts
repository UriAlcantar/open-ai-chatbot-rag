#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AiWebStack } from '../lib/ai-web-stack';

const app = new cdk.App();
new AiWebStack(app, 'AiWebStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'us-east-2' }
});
