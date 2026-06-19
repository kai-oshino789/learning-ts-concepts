import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

const elasticache = cdk.aws_elasticache;
const ec2 = cdk.aws_ec2;

export interface CacheConstructProps {
  envName?: string;
  vpc: cdk.aws_ec2.IVpc;
  redisSecurityGroup: cdk.aws_ec2.ISecurityGroup;
}

export class CacheConstruct extends Construct {
  public readonly redisHost: string;
  public readonly redisPort: number = 6379;

  constructor(scope: Construct, id: string, props: CacheConstructProps) {
    super(scope, id);

    const envName = props.envName ?? "dev";

    // 1. サブネットグループの作成
    // VPCのアイソレーテッドサブネットを選択
    const isolatedSubnetIds = props.vpc.selectSubnets({
      subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
    }).subnetIds;

    const subnetGroup = new elasticache.CfnSubnetGroup(this, "RedisSubnetGroup", {
      description: "Subnet group for ElastiCache Redis",
      subnetIds: isolatedSubnetIds,
    });

    if (envName === "dev") {
      // 開発環境はシングルノード（CacheCluster）
      const cacheCluster = new elasticache.CfnCacheCluster(this, "RedisCluster", {
        cacheNodeType: "cache.t4g.micro",
        engine: "redis",
        numCacheNodes: 1,
        vpcSecurityGroupIds: [props.redisSecurityGroup.securityGroupId],
        cacheSubnetGroupName: subnetGroup.ref,
        autoMinorVersionUpgrade: true,
      });

      // CacheCluster のエンドポイントホスト名を取得
      this.redisHost = cacheCluster.attrRedisEndpointAddress;
    } else {
      // 本番・検証環境は ReplicationGroup (マルチAZ、自動フェイルオーバー有効)
      const replicationGroup = new elasticache.CfnReplicationGroup(this, "RedisReplicationGroup", {
        replicationGroupDescription: `Redis replication group for ${envName}`,
        cacheNodeType: "cache.t4g.micro",
        engine: "redis",
        multiAzEnabled: true,
        automaticFailoverEnabled: true,
        numCacheClusters: 2, // プライマリ1 + レプリカ1
        securityGroupIds: [props.redisSecurityGroup.securityGroupId],
        cacheSubnetGroupName: subnetGroup.ref,
        autoMinorVersionUpgrade: true,
      });

      // ReplicationGroup のプライマリエンドポイントアドレスを取得
      this.redisHost = replicationGroup.attrPrimaryEndPointAddress;
    }
  }
}
