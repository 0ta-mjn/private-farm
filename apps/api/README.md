# Hono API サーバー

このレポジトリのゴールは小規模個人農家向けのIoT基盤システムを構築することです。

このレポジトリではturborepoを使用して、モノレポ形式で開発を行います。
パッケージマネージャはpnpmを使用し、Node.jsのバージョンは22.xを想定しています。

バックエンドはHonoを使用してAPIを提供します。
フロントエンドはNext.jsを使用します。

認証はsupabaseを使用し、DBはDrizzle ORMを使用したPostgreSQLとします。

## APIの構成

- **APIパッケージ**: `apps/api`
  - Honoを使用したサーバー実装
  - ルーティング、ミドルウェア、認証、バリデーション、エラーハンドリングを実装
  - ビジネスロジックを各ルートハンドラー内に直接実装
- **DBパッケージ**: `packages/dashboard-db`
  - Drizzle ORMを使用したデータベースの設定とマイグレーションを管理
  - リポジトリインターフェースと複数のDB適応戦略を提供

## ディレクトリ構成

```text
src/
├── app.ts          # Hono アプリケーション設定
├── auth.ts         # 認証ミドルウェア・ユーティリティ
├── db.ts           # データベース接続設定
├── errors.ts       # エラーハンドリング
├── index.ts        # エントリーポイント
├── middleware/     # 共通ミドルウェア
│   └── organization.ts  # 組織メンバーシップ確認
└── routes/         # APIルートハンドラー
    ├── diary.ts    # 農作業日誌 CRUD
    ├── discord.ts  # Discord 連携
    ├── organization.ts # 組織管理
    ├── thing.ts    # デバイス・観測対象管理
    └── user.ts     # ユーザー管理
```

## 技術的特徴

- **Repository Pattern**: `@repo/dashboard-db` のインターフェースを使用
- **エラーハンドリング**: 統一されたエラー型とHTTP例外への変換
- **認証**: Supabase Auth を使用したJWT認証
- **バリデーション**: Zodスキーマによる入力検証
- **Cloudflare Workers**: サーバーレス環境でのデプロイ対応
