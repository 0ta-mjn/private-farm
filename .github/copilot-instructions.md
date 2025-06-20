# プロジェクト概要

このレポジトリのゴールは小規模個人農家向けのIoT基盤システムを構築することです。

このレポジトリではturborepoを使用して、モノレポ形式で開発を行います。
パッケージマネージャはpnpmを使用し、Node.jsのバージョンは20.xを想定しています。

フロントエンドはNext.jsを使用し、UIはshadcn/uiをベースにしたコンポーネントライブラリを使用します。
バックエンドはtRPCを使用してFastifyでAPIを提供します。
データベースはPostgreSQLを使用し、ORMにはDrizzleを使用します。

以下のディレクトリ構成で開発を進めます。

```
apps/ # ダッシュボードやAPIサーバーなどのアプリケーションコード
  dashboard/ # フロントエンドダッシュボード
  api/ # バックエンドAPIサーバー
packages/ # 共通ライブラリやコンポーネント
  api/ # tRPCクライアント
  config/ # 共通設定
  core/ # サーバー内のビジネスロジック
  db/ # データベース関連のコード（Drizzle ORM）
  supabase/ # Supabase関連のコード
  e2e-tests/ # エンドツーエンドテスト用のコード
  ... # その他のeslintやtsconfigなどの設定ファイル
docs/ # ドキュメントや仕様書
scripts/ # ビルドやデプロイ用のスクリプト
```

タスクを開始する前に、実装手順や注意点を確認するために、フロントエンドなら`apps/dashboard/README.md`、バックエンドなら`apps/api/README.md`を確認してください。

## 出力に関する注意

できるだけ端的に述べることを心がけ、冗長な説明は避けてください。
ファイル名は英語でkebab-caseを使用してください。
