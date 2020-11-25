import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as publisher from '../lib/log-publisher';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new publisher.LogPublisher(app, 'MyTestStack', new ec2.Vpc(app, 'MyTestVPC'));
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
