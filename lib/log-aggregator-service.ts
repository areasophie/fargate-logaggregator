import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2';
import * as ecs from '@aws-cdk/aws-ecs';
import * as logs from '@aws-cdk/aws-logs';
import * as s3 from '@aws-cdk/aws-s3';

export class LogAggregatorService extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, cluster: ecs.Cluster, props?: cdk.StackProps) {
    super(scope, id, props);

    // Log Store
    const s3LogStore = new s3.Bucket(this, 'log-store');

    // Load Balancer
    const targetGroup = new elbv2.NetworkTargetGroup(this, 'logaggregator-target', {
      port: 512,
      protocol: elbv2.Protocol.UDP,
      targetType: elbv2.TargetType.IP,
      vpc: cluster.vpc,
    });
    const lb = new elbv2.NetworkLoadBalancer(this, 'lb', {
      vpc: cluster.vpc,
      vpcSubnets: cluster.vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE }),
      internetFacing: false,
      crossZoneEnabled: true,
      loadBalancerName: 'logaggregator',
    });

    const listener = lb.addListener('loglistener', {
      port: 514,
      protocol: elbv2.Protocol.UDP,
    });

    const logGroup = new logs.LogGroup(this, 'log-group', {
      logGroupName: this.node.tryGetContext('log-aggregator-demo')
    });

    // Task Def
    const executionRole = new iam.Role(this, 'EcsTaskExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy')
      ],
    });
    const taskRole = new iam.Role(this, 'EcsServiceTaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });
    const s3ListStatement = new iam.PolicyStatement();
    s3ListStatement.addActions('s3:ListBucket');
    s3ListStatement.addResources(s3LogStore.bucketArn);
    const s3ReadWriteStatement = new iam.PolicyStatement();
    s3ReadWriteStatement.addActions('s3:*Object');
    s3ReadWriteStatement.addResources(`${s3LogStore.bucketArn}/*`);
    taskRole.addToPrincipalPolicy(s3ListStatement);
    taskRole.addToPrincipalPolicy(s3ReadWriteStatement);

    const taskDef = new ecs.FargateTaskDefinition(this, 'taskDef', {
      memoryLimitMiB: 512,
      cpu: 256,
      executionRole,
      taskRole,
    });
    const mainContainer = taskDef.addContainer('main', {
        image: ecs.ContainerImage.fromRegistry('public.ecr.aws/p8a1p8y3/syslog-fluent-bit:0.4'),
        logging: ecs.LogDriver.awsLogs({
          streamPrefix: 'logaggregator-demo',
          logGroup,
        }),
        environment: {
          'S3_BUCKET': s3LogStore.bucketName,
          'S3_REGION': cdk.Stack.of(this).region,
        }
    });
    mainContainer.addPortMappings({
      protocol: ecs.Protocol.UDP,
      containerPort: 514,
    });
    mainContainer.addPortMappings({
      protocol: ecs.Protocol.TCP,
      containerPort: 2020,
    });

    // SG
    const syslogSG = new ec2.SecurityGroup(this, 'syslog-sg', { vpc: cluster.vpc });
    syslogSG.addIngressRule(ec2.Peer.ipv4(cluster.vpc.vpcCidrBlock), ec2.Port.allTraffic());
    syslogSG.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.allTraffic());

    // Service Def
    const logAggregatorService = new ecs.FargateService(this, 'service', {
      cluster,
      taskDefinition: taskDef,
      platformVersion: ecs.FargatePlatformVersion.VERSION1_4,
      securityGroups: [ syslogSG ],
    });
    listener.addTargets('target', {
      port: 514,
      protocol: elbv2.Protocol.UDP,
      targets: [
        logAggregatorService.loadBalancerTarget({
          containerName: 'main',
          containerPort: 514,
          protocol: ecs.Protocol.UDP,
        }),
      ],
      healthCheck: {
        port: '2020',
      },
    });
  }
}
