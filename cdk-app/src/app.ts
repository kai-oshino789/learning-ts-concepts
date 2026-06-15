import * as cdk from "aws-cdk-lib";
import { ThreeTierStack } from "./three-tier-stack";

const app = new cdk.App();
new ThreeTierStack(app, "ThreeTierStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

app.synth();
