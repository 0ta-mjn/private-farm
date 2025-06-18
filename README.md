# Private Farm IoT システム

小規模個人農家向けのIoT基盤システムです。農業の効率化・省力化と生産性向上を目指します。

## プロジェクト概要

このシステムは小規模多品種栽培の農場向けのIoTシステムであり、以下の機能を提供します：

- **農場監視**: 土壌環境（体積含水率、土壌温度、土壌EC）と気象環境（気温、湿度、降水量、風速、日射量）の監視
- **ダッシュボード**: リアルタイムデータ表示、履歴データ表示、通知設定
- **農作業日誌**: 作業記録の入力・管理、写真添付、タグ付け機能
- **デバイス管理**: センサーデバイスの登録・設定・状態監視

## 技術スタック

- **モノレポ管理**: Turborepo
- **パッケージマネージャ**: pnpm
- **フロントエンド**: Next.js 15 (App Router) + React 19
- **UI**: shadcn/ui + Tailwind CSS v4.0
- **バックエンド**: tRPC + Fastify
- **データベース**: PostgreSQL + Drizzle ORM
- **認証**: Supabase Auth
- **開発環境**: Turbopack
- **テスト**: Vitest
- **型安全性**: TypeScript

## プロジェクト構成

### Apps and Packages

- `apps/dashboard`: Next.js製のフロントエンドダッシュボード
- `apps/api`: Fastify製のAPIサーバー
- `packages/api`: tRPCルーターとエンドポイント定義
- `packages/core`: ビジネスロジック実装
- `packages/db`: Drizzle ORMによるデータベース設定
- `packages/config`: 設定ファイルとエラー定義
- `packages/supabase`: Supabase設定
- `packages/eslint-config`: ESLint設定
- `packages/tsconfig`: TypeScript設定
- `emulator`: Supabaseローカル開発環境

### 開発環境セットアップ

#### 必要な環境

- Node.js 20.x
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
   pnpm emulator:start
   ```

1. データベースマイグレーション

   ```bash
   pnpm db:push
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

## 開発ガイドライン

### アーキテクチャ

プロジェクトは関数型プログラミングのスタイルを取り入れ、TDD（テスト駆動開発）を意識した実装を行います。

1. **tRPCルーター**: `packages/api/src/router/`にエンドポイントを定義
2. **ビジネスロジック**: `packages/core/src/services`に実装
3. **テスト**: ビジネスロジックと同じ階層にテストファイルを配置

### フロントエンド

- **認証**: 認証状態は複数の独立したContextに分離
- **フォームバリデーション**: react-hook-form + Zod
- **スタイリング**: Tailwind CSS + `cn`関数による条件付きクラス結合
- **tRPC**: `@trpc/tanstack-react-query`によるデータフェッチング

### バックエンド

- **API実装**: tRPCプロシージャとしてエンドポイントを定義
- **エラーハンドリング**: カスタムエラークラスによる型安全なエラー処理
- **データベース**: Drizzle ORMによる型安全なクエリ

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

### Phase 2: データ取得パイプライン実装

- 🚧 デバイス管理機能
- 🚧 センサーデータ取得パイプライン

### Phase 3: ダッシュボード表示実装

- ⏳ リアルタイムデータ表示
- ⏳ 履歴データ表示

### Phase 4: 通知機能・天気予報

- ⏳ 通知機能
- ⏳ 天気予報表示
