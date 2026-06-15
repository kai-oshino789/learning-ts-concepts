import { Construct } from "constructs";

export interface ApplicationConstructProps {}

export class ApplicationConstruct extends Construct {
  constructor(scope: Construct, id: string, props?: ApplicationConstructProps) {
    super(scope, id);
    this.initialize(props);
  }

  public initialize(_props?: ApplicationConstructProps): void {
    // TODO: define application resources here
  }
}
