#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { LogPublisher } from '../lib/log-publisher';
import { LogAggregator } from '../lib/log-aggregator';
import { LogAggregatorService } from '../lib/log-aggregator-service';

const app = new cdk.App();
const aggregator = new LogAggregator(app, 'log-aggregator');
new LogAggregatorService(app, 'log-aggregator-service', aggregator.cluster);
new LogPublisher(app, 'log-publisher', aggregator.cluster.vpc);
