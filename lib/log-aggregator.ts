import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecs from '@aws-cdk/aws-ecs';

export class LogAggregator extends cdk.Stack {
  cluster: ecs.Cluster;

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'base', {
      cidr: "10.5.0.0/16",
      maxAzs: 1,
    });

    this.cluster = new ecs.Cluster(this, 'cluster', {
      vpc: vpc
    });
  }
}
