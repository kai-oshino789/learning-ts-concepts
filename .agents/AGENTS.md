# プロジェクト固有の開発ルール

## 1. AWS CDK / Infrastructure as Code (IaC)

### RDS Proxy 接続許可のベストプラクティス
- `DatabaseProxy` (RDS Proxy) にはデフォルトポートが定義されていません。
- Proxy へのアクセス許可（セキュリティグループルール）を定義する際は、`allowDefaultPortFrom()` ではなく、ポートを明示的に指定した `allowFrom()` を使用してください。
  * 例: `db.proxy.connections.allowFrom(compute.service, cdk.aws_ec2.Port.tcp(3306));`

### CDK Assertions テストの安定化
- `Match.objectLike` などのアサーションヘルパーは、`Fn::GetAtt` 等の CloudFormation 組み込み関数（オブジェクト値）を含む配列を検証する際に不安定になる場合があります。
- `Match` ヘルパーで不一致エラーが発生した場合は、`template.findResources('AWS::ECS::TaskDefinition')` 等でプレーンオブジェクトを取得し、Jest の `expect().toContainEqual(...)` や `expect().toHaveProperty(...)` でアサートを行ってください。

## 2. CDK for Terraform (CDKTF)

### Windows 環境でのインストールエラーの回避
- Windows 環境で `cdktf-cli` の依存モジュールをインストールする際、`node-pty` のビルドが失敗しインストールが中断することがあります。
- この現象を回避するため、Windows 環境でローカルインストールする際は、インストールスクリプトを無視するフラグを付与してください：
  * コマンド: `npm install --ignore-scripts`
