import { Construct } from "constructs";

export interface VpcConstructProps {}

export class VpcConstruct extends Construct {
  constructor(scope: Construct, id: string, props?: VpcConstructProps) {
    super(scope, id);
    this.initialize(props);
  }

  public initialize(_props?: VpcConstructProps): void {
    // TODO: define VPC resources here
  }
}
