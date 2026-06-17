import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { ThreeTierStack } from "../lib/stack";

test("ThreeTierStack Synthesizes Correctly", () => {
  const app = new cdk.App();
  const stack = new ThreeTierStack(app, "TestStack", {
    env: {
      account: "123456789012",
      region: "ap-northeast-1",
    },
    envName: "dev",
    instanceSize: "t3.small",
    dbCapacity: 1,
    vpcCidr: "10.0.0.0/16",
  });

  const template = Template.fromStack(stack);

  // VPC が作成されていることを確認
  template.resourceCountIs("AWS::EC2::VPC", 1);

  // ALB が作成されていることを確認
  template.resourceCountIs("AWS::ElasticLoadBalancingV2::LoadBalancer", 1);

  // WAF (WebACL) が作成されていることを確認
  template.resourceCountIs("AWS::WAFv2::WebACL", 1);

  // ECS クラスターとサービスが作成されていることを確認
  template.resourceCountIs("AWS::ECS::Cluster", 1);
  template.resourceCountIs("AWS::ECS::Service", 1);

  // データベース (RDS Aurora Cluster) が作成されていることを確認
  template.resourceCountIs("AWS::RDS::DBCluster", 1);
});
