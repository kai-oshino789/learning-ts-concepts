# 共有出力定義書（Shared Outputs Specification）

> [!IMPORTANT]
> **【管理アカウント側（`aws-landing-zone`）の AI アシスタントへの指示】**
> AWS Organizations や Control Tower を用いて各環境のアカウントを払い出し、デプロイ用 IAM ロールや S3 バケットを作成したら、**このドキュメントの「`【未設定】`」部分を実際に出力された AWS のリソース値（ARN や ID）で書き換えてコミット・プッシュしてください。**

---

## 1. 環境別共有パラメータ一覧

各ターゲット環境のデプロイおよび監視定義の適用に必要な AWS リソースの接続情報です。

### 1. 開発環境 (Development)
| パラメータ名 | 設定値 | 利用先（本リポジトリ） |
| :--- | :--- | :--- |
| **AWS Account ID** | `555555555555` | OIDC ロール信頼ポリシーの検証 |
| **OIDC Deploy Role ARN** | `arn:aws:iam::555555555555:role/GitHubActionsWorkflowDeployRole` | `.github/workflows/deploy.yml` (ROLE_ARN_DEV) |
| **ECR Repository URI** | `555555555555.dkr.ecr.ap-northeast-1.amazonaws.com/app-repo-dev` | `.github/workflows/deploy.yml` (ECR_REPO) |
| **CDKTF S3 Bucket** | `aws-landing-zone-cdktf-state-dev` | `.github/workflows/datadog.yml` (TERRAFORM_STATE_BUCKET) |
| **CDKTF DynamoDB Table**| `aws-landing-zone-cdktf-lock-dev` | `.github/workflows/datadog.yml` (TERRAFORM_LOCK_TABLE) |
| **Static Assets S3 Bucket** | `static-assets-dev-555555555555` | `docs/runbook/application-deployment.md` (アセット同期先) |
| **LOG_ARCHIVE_FIREHOSE_ARN** | `arn:aws:firehose:ap-northeast-1:222222222222:deliverystream/LogArchiveDeliveryStream` | CloudWatch Logs配信先のFirehoseストリームARN |
| **LOG_ARCHIVE_DELIVERY_ROLE_ARN** | `arn:aws:iam::222222222222:role/CrossAccountLogsDeliveryRole` | CloudWatch LogsがFirehoseへ送信する際に利用するロールARN |

### 2. 検証環境 (Staging)
| パラメータ名 | 設定値 | 利用先（本リポジトリ） |
| :--- | :--- | :--- |
| **AWS Account ID** | `666666666666` | OIDC ロール信頼ポリシーの検証 |
| **OIDC Deploy Role ARN** | `arn:aws:iam::666666666666:role/GitHubActionsWorkflowDeployRole` | `.github/workflows/deploy.yml` (ROLE_ARN_STG) |
| **ECR Repository URI** | `666666666666.dkr.ecr.ap-northeast-1.amazonaws.com/app-repo-stg` | `.github/workflows/deploy.yml` (ECR_REPO) |
| **CDKTF S3 Bucket** | `aws-landing-zone-cdktf-state-stg` | `.github/workflows/datadog.yml` (TERRAFORM_STATE_BUCKET) |
| **CDKTF DynamoDB Table**| `aws-landing-zone-cdktf-lock-stg` | `.github/workflows/datadog.yml` (TERRAFORM_LOCK_TABLE) |
| **Static Assets S3 Bucket** | `static-assets-stg-666666666666` | `docs/runbook/application-deployment.md` (アセット同期先) |
| **LOG_ARCHIVE_FIREHOSE_ARN** | `arn:aws:firehose:ap-northeast-1:222222222222:deliverystream/LogArchiveDeliveryStream` | CloudWatch Logs配信先のFirehoseストリームARN |
| **LOG_ARCHIVE_DELIVERY_ROLE_ARN** | `arn:aws:iam::222222222222:role/CrossAccountLogsDeliveryRole` | CloudWatch LogsがFirehoseへ送信する際に利用するロールARN |

### 3. 本番環境 (Production)
| パラメータ名 | 設定値 | 利用先（本リポジトリ） |
| :--- | :--- | :--- |
| **AWS Account ID** | `777777777777` | OIDC ロール信頼ポリシーの検証 |
| **OIDC Deploy Role ARN** | `arn:aws:iam::777777777777:role/GitHubActionsWorkflowDeployRole` | `.github/workflows/deploy.yml` (ROLE_ARN_PROD) |
| **ECR Repository URI** | `777777777777.dkr.ecr.ap-northeast-1.amazonaws.com/app-repo-prod` | `.github/workflows/deploy.yml` (ECR_REPO) |
| **CDKTF S3 Bucket** | `aws-landing-zone-cdktf-state-prod` | `.github/workflows/datadog.yml` (TERRAFORM_STATE_BUCKET) |
| **CDKTF DynamoDB Table**| `aws-landing-zone-cdktf-lock-prod` | `.github/workflows/datadog.yml` (TERRAFORM_LOCK_TABLE) |
| **Static Assets S3 Bucket** | `static-assets-prod-777777777777` | `docs/runbook/application-deployment.md` (アセット同期先) |
| **LOG_ARCHIVE_FIREHOSE_ARN** | `arn:aws:firehose:ap-northeast-1:222222222222:deliverystream/LogArchiveDeliveryStream` | CloudWatch Logs配信先のFirehoseストリームARN |
| **LOG_ARCHIVE_DELIVERY_ROLE_ARN** | `arn:aws:iam::222222222222:role/CrossAccountLogsDeliveryRole` | CloudWatch LogsがFirehoseへ送信する際に利用するロールARN |

---

## 2. 共有パラメータの反映フロー (GitOps)

```mermaid
sequenceDiagram
    participant LZ_AI as landing-zone AI
    participant Repo as docs/governance/shared-outputs.md
    participant App_AI as learning-ts-concepts AI
    
    LZ_AI->>LZ_AI: 1. AWS Organizations にてアカウント / ロール作成
    LZ_AI->>Repo: 2. 実際のアカウントID / ロールARNを書き込んでプッシュ
    Note over Repo: GitHub Trigger / Pull / Sync
    App_AI->>Repo: 3. 更新されたロールARN等を読み込み
    App_AI->>App_AI: 4. GitHub Actions Secret やインフラコードに自動反映してデプロイ
```

1. **`aws-landing-zone` 側のインフラ構築**:
   プラットフォーム管理者が `Management` アカウント上でアカウントプロビジョニングを実行し、OIDC の引き受け用ロール等を作成します。
2. **本ファイルへの書き込み**:
   作成完了後、Organizations 側の AI または管理者が、本ファイルの `【未設定】` 箇所を埋めてプッシュします。
3. **`learning-ts-concepts` 側のデプロイ**:
   本リポジトリの AI （または開発者）は、このドキュメントの変更を検知（あるいは `git pull` して読み込み）、値に基づいてデプロイメント定義を同期し、CDK / CDKTF を実行して安全に個別アカウントへデプロイを完了させます。
