import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecs_patterns from "aws-cdk-lib/aws-ecs-patterns";
import * as rds from "aws-cdk-lib/aws-rds";
import * as s3 from "aws-cdk-lib/aws-s3";

export class ThreeTierStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "ThreeTierVpc", {
      maxAzs: 3,
      natGateways: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "Public",
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: "Application",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 24,
          name: "Database",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    const bucket = new s3.Bucket(this, "AppBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    const cluster = new ecs.Cluster(this, "AppCluster", {
      vpc,
    });

    const taskDefinition = new ecs.FargateTaskDefinition(this, "AppTaskDef", {
      cpu: 512,
      memoryLimitMiB: 1024,
    });
    taskDefinition.addContainer("AppContainer", {
      image: ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample"),
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: "ThreeTier" }),
      environment: {
        BUCKET_NAME: bucket.bucketName,
      },
    });

    const service = new ecs_patterns.ApplicationLoadBalancedFargateService(this, "AppService", {
      cluster,
      taskDefinition,
      publicLoadBalancer: true,
      desiredCount: 2,
      listenerPort: 80,
      assignPublicIp: false,
      publicLoadBalancerSecurityGroups: [],
      memoryLimitMiB: 1024,
      cpu: 512,
    });

    bucket.grantReadWrite(taskDefinition.taskRole);

    const dbSecurityGroup = new ec2.SecurityGroup(this, "DbSecurityGroup", {
      vpc,
      description: "Allow ECS access to the RDS instance",
      allowAllOutbound: true,
    });
    dbSecurityGroup.addIngressRule(
      service.service.connections.securityGroups[0],
      ec2.Port.tcp(5432),
      "Allow ECS to connect to RDS"
    );

    const dbSubnetGroup = new rds.SubnetGroup(this, "DbSubnetGroup", {
      description: "Subnet group for PostgreSQL",
      vpc,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
    });

    const rdsInstance = new rds.DatabaseInstance(this, "AppDatabase", {
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_15 }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.SMALL),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [dbSecurityGroup],
      subnetGroup: dbSubnetGroup,
      multiAz: true,
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      publiclyAccessible: false,
      deletionProtection: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deleteAutomatedBackups: true,
      credentials: rds.Credentials.fromGeneratedSecret("dbadmin"),
    });

    rdsInstance.connections.allowDefaultPortFrom(service.service.connections.securityGroups[0], "Allow ECS to RDS");

    new cdk.CfnOutput(this, "LoadBalancerDNS", {
      value: service.loadBalancer.loadBalancerDnsName,
    });
    new cdk.CfnOutput(this, "BucketName", {
      value: bucket.bucketName,
    });
    new cdk.CfnOutput(this, "DatabaseEndpoint", {
      value: rdsInstance.dbInstanceEndpointAddress,
    });
  }
}
