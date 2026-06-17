import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { VpcConstruct } from "./constructs/network";
import { DatabaseConstruct } from "./constructs/database";
import { ComputeConstruct } from "./constructs/compute";

export interface ThreeTierStackProps extends cdk.StackProps {
  /** EC2 instance size or similar identifier used by the application layer */
  instanceSize?: string;
  /** Logical capacity for the database */
  dbCapacity?: number;
  /** Logical environment name (dev/stg/prod) */
  envName?: string;
  /** Optional domain name for Route 53 */
  domainName?: string;
}

export class ThreeTierStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: ThreeTierStackProps) {
    super(scope, id, props);

    const instanceSize = props?.instanceSize;
    const dbCapacity = props?.dbCapacity;
    const envName = props?.envName;

    const vpcConstruct = new VpcConstruct(this, "VpcConstruct", { envName });

    const db = new DatabaseConstruct(this, "DatabaseConstruct", {
      dbCapacity,
      envName,
      vpc: vpcConstruct.vpc,
      dbSecurityGroup: vpcConstruct.dbSecurityGroup,
    });

    const compute = new ComputeConstruct(this, "ComputeConstruct", {
      instanceSize,
      envName,
      vpc: vpcConstruct.vpc,
      ecsSecurityGroup: vpcConstruct.ecsSecurityGroup,
      dbSecurityGroup: vpcConstruct.dbSecurityGroup,
      dbSecretArn: db.secret?.secretArn,
    });

    // Allow DB secret to be read by ECS task role if needed
    if (compute.service) {
      db.secret.grantRead(compute.service.taskDefinition.taskRole);
      // Allow ECS tasks to connect to the DB
      db.cluster.connections.allowDefaultPortFrom(compute.service);
    }

    // Create Application Load Balancer
    const elbv2 = cdk.aws_elasticloadbalancingv2;
    const alb = new elbv2.ApplicationLoadBalancer(this, "ApplicationLoadBalancer", {
      vpc: vpcConstruct.vpc,
      internetFacing: true,
      securityGroup: vpcConstruct.albSecurityGroup,
      vpcSubnets: { subnetType: cdk.aws_ec2.SubnetType.PUBLIC },
    });

    // Add HTTP Listener on Port 80
    const listener = alb.addListener("HttpListener", {
      port: 80,
      open: true,
    });

    // Add ECS Service as target
    if (compute.service) {
      listener.addTargets("EcsTarget", {
        port: 3000,
        protocol: elbv2.ApplicationProtocol.HTTP,
        targets: [compute.service],
        healthCheck: {
          path: "/",
          interval: cdk.Duration.seconds(30),
        },
      });
    }

    // 1. AWS WAF (Web Application Firewall) - Regional WebACL for ALB
    const wafv2 = cdk.aws_wafv2;
    const webAcl = new wafv2.CfnWebACL(this, "AlbWebAcl", {
      defaultAction: { allow: {} },
      scope: "REGIONAL",
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: "AlbWebAcl",
        sampledRequestsEnabled: true,
      },
      rules: [
        {
          name: "AWSManagedRulesCommonRuleSet",
          priority: 1,
          statement: {
            managedRuleGroupStatement: {
              vendorName: "AWS",
              name: "AWSManagedRulesCommonRuleSet",
            },
          },
          overrideAction: { none: {} },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: "AWSManagedRulesCommonRuleSet",
            sampledRequestsEnabled: true,
          },
        },
      ],
    });

    new wafv2.CfnWebACLAssociation(this, "AlbWebAclAssociation", {
      resourceArn: alb.loadBalancerArn,
      webAclArn: webAcl.attrArn,
    });

    // 2. Amazon CloudFront Distribution (Origin: ALB)
    const cloudfront = cdk.aws_cloudfront;
    const origins = cdk.aws_cloudfront_origins;

    const distribution = new cloudfront.Distribution(this, "CloudFrontDistribution", {
      defaultBehavior: {
        origin: new origins.LoadBalancerV2Origin(alb, {
          protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
        }),
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
      },
    });

    // 3. Amazon Route 53 (Optional - only if domainName is provided)
    if (props?.domainName) {
      const route53 = cdk.aws_route53;
      const targets = cdk.aws_route53_targets;

      const zone = route53.HostedZone.fromLookup(this, "HostedZone", {
        domainName: props.domainName,
      });

      new route53.ARecord(this, "AliasRecord", {
        zone: zone,
        recordName: props.domainName,
        target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
      });
    }
  }
}
