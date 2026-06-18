import { TerraformStack } from "cdktf";
import { Construct } from "constructs";
import { DatadogProvider } from "@cdktf/provider-datadog/lib/provider";
import { DatadogConfig } from "./config/config";
import { EcsMonitors } from "./monitors/ecs-monitors";
import { RdsMonitors } from "./monitors/rds-monitors";

export interface DatadogStackProps {
  config: DatadogConfig;
}

export class DatadogStack extends TerraformStack {
  constructor(scope: Construct, id: string, props: DatadogStackProps) {
    super(scope, id);

    // Datadog プロバイダーの定義
    new DatadogProvider(this, "datadog", {
      apiKey: props.config.apiKey,
      appKey: props.config.appKey,
    });

    // 各監視アラートの構築
    new EcsMonitors(this, "EcsMonitors", { env: props.config.env });
    new RdsMonitors(this, "RdsMonitors", { env: props.config.env });
  }
}
