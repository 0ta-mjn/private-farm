# Discord 通知システム

Private Farm IoTシステムのDiscord通知機能を提供するCloudflare Workers群です。農場の状態変化や異常検知時にDiscord上で通知を送信します。

## 概要

このパッケージは、Private Farm IoTシステムの様々なイベントに対してDiscord通知を送信するCloudflare Workers群を提供します。
現在はデイリー通知機能を中心に実装されており、`@repo/discord`パッケージのWebhook機能を活用しています。

## 機能

| 優先度    | 機能              | トリガー／頻度            | 価値                         | 実装コスト                                 |
| ------ | --------------- | ------------------ | -------------------------- | ------------------------------------- |
| **★1** | **日次ダイジェスト**    | 毎朝 05:30 JST       | 前日の作業が 1 分で把握でき、振り返り習慣を定着  | **低** – 1 本の集計クエリ＋Webhook             |
| **★2** | **週間サマリー**      | 月曜 07:00 JST       | 作業バランス・工数を可視化し PDCA を回しやすい | 中 – PNG グラフ生成が追加                      |
| **★3** | **月次サマリー**      | 月初 07:00 JST     | 月間の作業傾向を把握し、長期的な改善に役立つ   | 中 – PNG グラフ生成が追加                      |

## 技術スタック

- **Runtime**: Node.js 22
- **Framework**: Cloudflare Workers
- **Build Tool**: tsup + TypeScript
- **Validation**: Zod
- **Deployment**: Cloudflare Workers (Wrangler)
- **Package Manager**: pnpm

## プロジェクト構成

```text
src/
└── daily/            # デイリー通知 Worker
    ├── index.ts      # Worker エントリーポイント
    └── [関連ファイル]
```

## 開発環境セットアップ

### 環境変数設定

`.env`ファイルを作成して必要な環境変数を設定してください：

```bash
# 開発用環境変数
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

Cloudflare Workersへのデプロイは、以下のコマンドを使用してください：

```bash
# デイリー通知 Worker のデプロイ
pnpm cf:deploy:daily

# プロジェクトルートから全体ビルド
pnpm build --filter=reviewer
```

## 今後の拡張予定

- **農場アラート通知**: 土壌水分異常、気温異常などの通知
- **写真アップロード**: 作業日誌に写真を添付する機能
- **音声入力**: 音声で作業内容を入力する機能

## 関連パッケージ

- `@repo/dashboard-db`: データベース操作・リポジトリインターフェース
- `@repo/discord`: Discord API統合・Webhook送信
- `@repo/config`: 環境設定管理
- `@repo/eslint-config`: ESLint設定
- `@repo/tsconfig`: TypeScript設定

## ライセンス

このプロジェクトはPrivate Farm IoTシステムの一部です。
