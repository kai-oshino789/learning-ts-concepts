export interface DatadogConfig {
  apiKey: string;
  appKey: string;
  env: string;
}

export function getDatadogConfig(): DatadogConfig {
  return {
    apiKey: process.env.DATADOG_API_KEY ?? "",
    appKey: process.env.DATADOG_APP_KEY ?? "",
    env: process.env.APP_ENV ?? "dev",
  };
}
