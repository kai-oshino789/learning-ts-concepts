import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

const ecs = cdk.aws_ecs;
const ec2 = cdk.aws_ec2;
const ecr = cdk.aws_ecr;

export interface ComputeConstructProps {
  instanceSize?: string;
  envName?: string;
  vpc: cdk.aws_ec2.IVpc;
  ecsSecurityGroup?: cdk.aws_ec2.ISecurityGroup;
  dbSecurityGroup?: cdk.aws_ec2.ISecurityGroup;
  dbSecretArn?: string;
}

export class ComputeConstruct extends Construct {
  public readonly cluster: cdk.aws_ecs.ICluster;
  public readonly service?: cdk.aws_ecs.FargateService;
  public readonly repository: cdk.aws_ecr.Repository;

  constructor(scope: Construct, id: string, props: ComputeConstructProps) {
    super(scope, id);

    const instanceSize = props.instanceSize ?? "t3.small";
    const mapping: Record<string, { cpu: number; memoryMiB: number }> = {
      "t3.small": { cpu: 256, memoryMiB: 512 },
      "t3.medium": { cpu: 512, memoryMiB: 1024 },
      "t3.large": { cpu: 1024, memoryMiB: 2048 },
    };
    const spec = mapping[instanceSize] ?? { cpu: 512, memoryMiB: 1024 };

    // ECRリポジトリの定義
    // 開発用/本番用の環境名を含めたリポジトリを作成
    this.repository = new ecr.Repository(this, "AppRepository", {
      repositoryName: `app-repo-${props.envName ?? "dev"}`,
      // 開発時は DESTROY、本番（prod）時は意図しないデータ消失を防ぐため RETAIN とし、
      // 開発用はスタック削除時に自動でイメージを含め削除する
      removalPolicy: props.envName === "prod" 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: props.envName !== "prod",
      imageScanOnPush: true, // セキュリティ向上のためイメージスキャンを有効化
    });

    const cluster = new ecs.Cluster(this, "EcsCluster", { vpc: props.vpc });
    this.cluster = cluster;

    const taskDef = new ecs.FargateTaskDefinition(this, "TaskDef", {
      cpu: spec.cpu,
      memoryLimitMiB: spec.memoryMiB,
    });

    // CDKコンテキストパラメータからイメージタグを取得する
    const imageTag = this.node.tryGetContext("imageTag");
    
    // imageTagコンテキストパラメータが存在する場合はECRからイメージを取得し、
    // 存在しない（初回デプロイ等）場合はサンプルイメージを使用する
    const containerImage = imageTag
      ? ecs.ContainerImage.fromEcrRepository(this.repository, imageTag)
      : ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample");

    const container = taskDef.addContainer("AppContainer", {
      image: containerImage,
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: "app" }),
      environment: {
        ENV: props.envName ?? "dev",
        DB_SECRET_ARN: props.dbSecretArn ?? "",
      },
    });
    container.addPortMappings({ containerPort: 80 });

    const sg = props.ecsSecurityGroup ?? new ec2.SecurityGroup(this, "EcsSecurityGroup", { vpc: props.vpc });

    const service = new ecs.FargateService(this, "FargateService", {
      cluster,
      taskDefinition: taskDef,
      assignPublicIp: false,
      securityGroups: [sg],
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      circuitBreaker: { rollback: true },
      minHealthyPercent: 100,
    });

    this.service = service;
  }
}

