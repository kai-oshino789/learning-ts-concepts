import { Construct } from "constructs";

export interface DatabaseConstructProps {}

export class DatabaseConstruct extends Construct {
  constructor(scope: Construct, id: string, props?: DatabaseConstructProps) {
    super(scope, id);
    this.initialize(props);
  }

  public initialize(_props?: DatabaseConstructProps): void {
    // TODO: define database resources here
  }
}
