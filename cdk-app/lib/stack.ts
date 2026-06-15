import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { VpcConstruct } from "./constructs/network";
import { DatabaseConstruct } from "./constructs/database";
import { ApplicationConstruct } from "./constructs/application";

export class ThreeTierStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new VpcConstruct(this, "VpcConstruct", {});
    new DatabaseConstruct(this, "DatabaseConstruct", {});
    new ApplicationConstruct(this, "ApplicationConstruct", {});
  }
}
