# SatoPod IoT システム

小規模個人農家向けのIoT基盤システムです。農業の効率化・省力化と生産性向上を目指します。

## プロジェクト概要

このシステムは小規模多品種栽培の農場向けのIoTシステムであり、以下の機能を提供します：

- **農場監視**: 土壌環境（体積含水率、土壌温度、土壌EC）と気象環境（気温、湿度、降水量、風速、日射量）の監視
- **ダッシュボード**: リアルタイムデータ表示、履歴データ表示、通知設定
- **農作業日誌**: 作業記録の入力・管理、写真添付、タグ付け機能
- **デバイス管理**: センサーデバイスの登録・設定・状態監視

## 技術スタック

### 開発・ビルドツール

- **モノレポ管理**: Turborepo
- **パッケージマネージャ**: pnpm (workspace対応)
- **開発環境**: Turbopack
- **型安全性**: TypeScript
- **コード品質**: ESLint + Prettier

### フロントエンド

- **フレームワーク**: Next.js 15 (App Router) + React 19
- **UI フレームワーク**: shadcn
- **スタイリング**: Tailwind CSS v4
- **状態管理**: Tanstack Query
- **フォーム**: React Hook Form
- **バリデーション**: Zod
- **日付処理**: date-fns + React Day Picker
- **アイコン**: Lucide React
- **通知**: Sonner
- **テーマ**: next-themes
- **テスト**: Vitest + Testing Library

### バックエンド

- **API フレームワーク**: Hono
- **バリデーション**: @hono/zod-validator + Zod
- **データベース**: PostgreSQL
- **ORM**: Drizzle ORM + drizzle-zod
- **スキーマ管理**: Drizzle Kit
- **認証**: Supabase Auth + @supabase/supabase-js
- **デプロイ**: Cloudflare Workers (Wrangler)

### Discord Bot

- **Discord 型定義**: discord-api-types
- **認証基盤**: Supabase
- **データベース**: PostgreSQL (Supabase)

### テスト・品質保証

- **単体テスト**: Vitest
- **UI テスト**: Testing Library (React)
- **E2E テスト**: Playwright
- **リント**: ESLint (TypeScript ESLint, React, Turbo)
- **フォーマット**: Prettier

## プロジェクト構成

### Apps（アプリケーション）

#### `apps/dashboard` - フロントエンドダッシュボード

- **フレームワーク**: Next.js 15 (App Router) + React 19
- **UI**: shadcn/ui + Radix UI + Tailwind CSS v4.0
- **スタイリング**: class-variance-authority, clsx, tailwind-merge
- **フォーム**: React Hook Form + Zod
- **日付**: date-fns, React Day Picker
- **アイコン**: Lucide React
- **通知**: Sonner
- **テーマ**: next-themes
- **テスト**: Vitest + Testing Library

**主要ディレクトリ**:

```text
src/
├── app/          # Next.js App Router
├── components/   # UIコンポーネント
├── contexts/     # React Context
├── hooks/        # カスタムフック
├── lib/         # ユーティリティ
├── rpc/         # API呼び出し層
└── shadcn/      # shadcn/ui コンポーネント
```

#### `apps/api` - APIサーバー

- **フレームワーク**: Hono
- **バリデーション**: @hono/zod-validator + Zod
- **デプロイ**: Cloudflare Workers (Wrangler)
- **ビルド**: tsup

**主要ディレクトリ**:

```text
src/
├── app.ts          # Honoアプリケーション
├── middleware/     # ミドルウェア
└── routes/         # APIルート
```

#### `apps/discord-bots` - Discord Bot

- **フレームワーク**: Express
- **Discord API**: discord-api-types
- **バリデーション**: Zod
- **テスト**: Vitest

### Packages（共有パッケージ）

#### `packages/core` - ビジネスロジック

- **機能**: サービス層の実装、エラー定義
- **依存関係**: @repo/config, @repo/db, @repo/discord
- **テスト**: Vitest

**構成**:

```text
src/
├── services/     # ビジネスロジック
├── errors.ts     # エラー定義
└── index.ts      # エントリーポイント
```

#### `packages/db` - データベース層

- **ORM**: Drizzle ORM
- **データベース**: PostgreSQL (postgres ライブラリ)
- **スキーマ管理**: Drizzle Kit
- **バリデーション**: drizzle-zod + Zod

**構成**:

```text
src/
├── client.ts     # データベースクライアント
├── schema.ts     # スキーマ定義
├── utils.ts      # ユーティリティ
└── index.ts      # エントリーポイント
```

#### `packages/config` - 設定管理

- **機能**: 環境変数、設定の型定義
- **バリデーション**: Zod

#### `packages/supabase` - Supabase設定

- **SDK**: @supabase/supabase-js
- **CLI**: supabase CLI
- **機能**: 認証、ローカル開発環境

#### `packages/discord` - Discord統合

- **API**: discord-api-types
- **依存関係**: @repo/config, @repo/db
- **機能**: Discord API統合、エラーハンドリング

#### `packages/e2e-tests` - E2Eテスト

- **フレームワーク**: Playwright
- **依存関係**: @repo/api, @repo/dashboard

#### `packages/eslint-config` - ESLint設定

- **構成**: Base, Next.js, React Internal
- **プラグイン**: TypeScript ESLint, React, Turbo

#### `packages/tsconfig` - TypeScript設定

- **機能**: 共通TypeScript設定

### パッケージ間の依存関係

```text
┌─────────────────┐    ┌─────────────────┐
│   dashboard     │───▶│      api        │
└─────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│     config      │    │      core       │
└─────────────────┘    └─────────────────┘
         ▲                       │
         │                       ▼
┌─────────────────┐    ┌─────────────────┐
│       db        │◀───│    discord      │
└─────────────────┘    └─────────────────┘
         ▲
         │
┌─────────────────┐
│    supabase     │
└─────────────────┘
```

### 開発環境セットアップ

#### 必要な環境

- Node.js 22.x
- pnpm
- Docker (Supabaseエミュレータ用)

#### セットアップ手順

1. 依存関係のインストール

   ```bash
   pnpm install
   ```

1. 環境変数の設定

   ```bash
   cp .env.sample .env
   # .envファイルを編集して必要な値を設定
   ```

1. Supabaseエミュレータの起動

   ```bash
   pnpm setup:testing
   ```

1. 開発サーバーの起動

   ```bash
   pnpm dev
   ```

### スクリプト

#### 開発

- `pnpm dev`: 全アプリケーションの開発サーバーを起動
- `pnpm build`: 全アプリケーションをビルド
- `pnpm lint`: リント実行
- `pnpm typecheck`: 型チェック実行

#### データベース

- `pnpm db:push`: データベーススキーマをプッシュ
- `pnpm db:studio`: Drizzle Studioを起動
- `pnpm db:push:testing`: テスト環境にスキーマをプッシュ
- `pnpm db:migration:new`: 新しい空のマイグレーションを作成

#### テスト

- `pnpm test`: テスト実行
- `pnpm test:ci`: CI環境でのテスト実行（エミュレータ起動含む）

#### エミュレータ

- `pnpm emulator:start`: Supabaseエミュレータを起動
- `pnpm emulator:stop`: Supabaseエミュレータを停止

## データモデル

主要なエンティティ：

- **Organization**: 組織（農場）
- **User**: ユーザー
- **Thing**: 観測対象（ほ場など）
- **Sensor**: センサーデバイス
- **Datastream**: データストリーム
- **Observation**: 観測データ
- **Diary**: 農作業日誌

## ロードマップ

### Phase 1: 農業日誌・ユーザー管理機能

- ✅ ユーザー登録・ログイン機能
- ✅ Organization作成機能
- ✅ 農業日誌の基本機能
- ✅ デイリー通知

### Phase 2: データ取得パイプライン実装

- 🚧 デバイス管理機能
- 🚧 センサーデータ取得パイプライン

### Phase 3: ダッシュボード表示実装

- ⏳ リアルタイムデータ表示
- ⏳ 履歴データ表示

### Phase 4: 通知機能・天気予報

- ⏳ 通知機能
- ⏳ 天気予報表示
