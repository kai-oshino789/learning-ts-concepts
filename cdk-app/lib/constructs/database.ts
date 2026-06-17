import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

const rds = cdk.aws_rds;
const secrets = cdk.aws_secretsmanager;

export interface DatabaseConstructProps {
  dbCapacity?: number;
  envName?: string;
  vpc: cdk.aws_ec2.IVpc;
  dbSecurityGroup?: cdk.aws_ec2.ISecurityGroup;
}

export class DatabaseConstruct extends Construct {
  public readonly cluster: cdk.aws_rds.DatabaseCluster;
  public readonly secret: cdk.aws_secretsmanager.ISecret;

  constructor(scope: Construct, id: string, props: DatabaseConstructProps) {
    super(scope, id);

    const dbCapacity = props.dbCapacity ?? 1;

    this.secret = new secrets.Secret(this, "DbSecret", {
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: "clusteradmin" }),
        excludePunctuation: true,
        includeSpace: false,
        generateStringKey: "password",
      },
    });

    this.cluster = new rds.DatabaseCluster(this, "AuroraServerlessV2", {
      engine: rds.DatabaseClusterEngine.auroraMysql({
        version: rds.AuroraMysqlEngineVersion.VER_3_05_2,
      }),
      credentials: rds.Credentials.fromSecret(this.secret),
      vpc: props.vpc,
      vpcSubnets: { subnetType: cdk.aws_ec2.SubnetType.PRIVATE_ISOLATED },
      writer: rds.ClusterInstance.serverlessV2("writer"),
      serverlessV2MinCapacity: dbCapacity,
      serverlessV2MaxCapacity: dbCapacity * 2,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      securityGroups: props.dbSecurityGroup ? [props.dbSecurityGroup] : undefined,
    });
  }
}
