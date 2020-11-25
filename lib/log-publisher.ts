import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';

export class LogPublisher extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, vpc: ec2.IVpc, props?: cdk.StackProps) {
    super(scope, id, props);

    const initConfig = new ec2.InitConfig([
      ec2.InitCommand.shellCommand('date'),
    ]);

    const securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
      vpc,
    });
    securityGroup.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.allTraffic());
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22));

    const publisher = new ec2.Instance(this, 'publisher', {
      vpc: vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.NANO),
      machineImage: ec2.MachineImage.latestAmazonLinux({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2
      }),
      vpcSubnets: vpc.selectSubnets({ subnetType: ec2.SubnetType.PUBLIC }),
      keyName: this.node.tryGetContext('keypair'),
      init: ec2.CloudFormationInit.fromConfig(initConfig),
    });

    publisher.addSecurityGroup(securityGroup);
  }
}
