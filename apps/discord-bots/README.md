# Discord Bots

Private Farm IoTシステムのDiscord通知機能を提供するCloud Functions群です。農場の状態変化や異常検知時にDiscord上で通知を送信します。

## 概要

このパッケージは、Private Farm IoTシステムの様々なイベントに対してDiscord通知を送信するGoogle Cloud Functions群を提供します。
ローカル環境では、Express.jsベースのサーバーとして実装され、複数のエンドポイントを公開しています。

## 機能

- **Hello World Function**: 基本的な動作確認用のエンドポイント
- **通知システム**: 農場の状態変化や異常検知時の通知（今後拡張予定）

## 技術スタック

- **Runtime**: Node.js 22
- **Framework**: Express.js
- **Build Tool**: tsup + TypeScript
- **Validation**: Zod
- **Deployment**: Google Cloud Functions
- **Package Manager**: pnpm

## プロジェクト構成

```text
src/
├── index.ts          # メインサーバー設定
├── hello-world.ts    # Hello World機能
└── [将来の機能]      # 通知機能など
```

## 開発環境セットアップ

### 環境変数設定

`.env`ファイルを作成して必要な環境変数を設定してください：

```bash
# 開発用環境変数
PORT=8080
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_WEBHOOK_URL=your_webhook_url
```

### 開発サーバー起動

```bash
# 依存関係のインストール
pnpm install

# 開発サーバー起動（ホットリロード付き）
pnpm dev

# 本番用ビルド
pnpm build

# 型チェック
pnpm typecheck

# Lint実行
pnpm lint
```

## デプロイメント

Google Cloud Functionsへのデプロイは、プロジェクトルートからTurborepoのビルドコマンドを使用してください。

```bash
# プロジェクトルートから
pnpm build --filter=discord-bots
```

## 今後の拡張予定

- **農場アラート通知**: 土壌水分異常、気温異常などの通知
- **作業リマインダー**: 定期的な農作業のリマインド通知
- **データレポート**: 日次/週次の農場データサマリー通知
- **システム状態通知**: IoTデバイスの接続状態変化通知

## 関連パッケージ

- `@repo/core`: ビジネスロジック
- `@repo/db`: データベース操作
- `@repo/eslint-config`: ESLint設定
- `@repo/tsconfig`: TypeScript設定

## ライセンス

このプロジェクトはPrivate Farm IoTシステムの一部です。
