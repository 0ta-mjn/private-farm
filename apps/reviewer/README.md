# Discord Bots

Private Farm IoTシステムのDiscord通知機能を提供するCloud Functions群です。農場の状態変化や異常検知時にDiscord上で通知を送信します。

## 概要

このパッケージは、Private Farm IoTシステムの様々なイベントに対してDiscord通知を送信するGoogle Cloud Functions群を提供します。
ローカル環境では、Express.jsベースのサーバーとして実装され、複数のエンドポイントを公開しています。

## 機能

| 優先度    | 機能              | トリガー／頻度            | 価値                         | 実装コスト                                 |
| ------ | --------------- | ------------------ | -------------------------- | ------------------------------------- |
| **★1** | **日次ダイジェスト**    | 毎朝 05:30 JST       | 前日の作業が 1 分で把握でき、振り返り習慣を定着  | **低** – 1 本の集計クエリ＋Webhook             |
| **★2** | **週間サマリー**      | 月曜 07:00 JST       | 作業バランス・工数を可視化し PDCA を回しやすい | 中 – PNG グラフ生成が追加                      |
| **★3** | **月次サマリー**      | 月初 07:00 JST     | 月間の作業傾向を把握し、長期的な改善に役立つ   | 中 – PNG グラフ生成が追加                      |

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
- **写真アップロード**: 作業日誌に写真を添付する機能
- **音声入力**: 音声で作業内容を入力する機能

## 関連パッケージ

- `@repo/core`: ビジネスロジック
- `@repo/db`: データベース操作
- `@repo/eslint-config`: ESLint設定
- `@repo/tsconfig`: TypeScript設定

## ライセンス

このプロジェクトはPrivate Farm IoTシステムの一部です。
