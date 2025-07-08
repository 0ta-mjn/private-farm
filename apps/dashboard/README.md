# ダッシュボード フロントエンド

このレポジトリのゴールは小規模個人農家向けのIoT基盤システムを構築することです。

このレポジトリではturborepoを使用して、モノレポ形式で開発を行います。
パッケージマネージャはpnpmを使用し、Node.jsのバージョンは22.xを想定しています。

フロントエンドはNext.jsを使用し、UIはshadcn/uiをベースにしたコンポーネントライブラリを使用します。
バックエンドはHonoを使用してAPIを提供します。

認証はsupabaseを使用する。

## コンフィグ

### パスエイリアス設定

- **@/**: `src/` ディレクトリのエイリアス
- **@/shadcn**: shadcn/ui コンポーネント用の専用ディレクトリ
- **@/lib**: ユーティリティ関数やライブラリ設定
- **@/rpc**: Hono RPC クライアント設定
- **@/components**: 汎用コンポーネント

### Next.js 設定

- **開発環境**: Turbopack を使用した高速開発体験
- **フォルダ構成**: App Router を使用

### UI

- **UIライブラリ**: shadcn/ui を使用
- **バージョン**: Tailwind CSS v4.0 使用
- **PostCSS**: `@tailwindcss/postcss` プラグイン使用
- **カスタムテーマ**: CSS変数ベースの設計システム. `@/app/globals.css` で定義
- **デザインシステム**: neutral ベースカラー、CSS Variables 有効
- **アニメーション**: `tw-animate-css` を追加で使用
- **ユーティリティ**: `tailwind-merge` と `clsx` による条件付きクラス管理

### 依存関係管理

- **パッケージマネージャー**: pnpm (Workspace 機能使用)
- **Monorepo**: Turborepo でパッケージ管理
- **カタログ機能**: 共通依存関係のバージョン統一
- **API設定**: Hono RPC クライアントとファクトリを使用してAPIエンドポイントの設定を統一

## 基本的な使用パターン

### Hono RPC使用方法

- `@/rpc/client` と `@/rpc/factory` を使用して、Hono RPC クライアントを React コンポーネント内で使用します。

```tsx
import { client } from "@/rpc/client";
import { users } from "@/rpc/factory";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

...

// Query（データ取得）
const { data: userData, isLoading } = useQuery({
  ...users.getUser(),
  enabled: !!userId, // 条件付きクエリ実行
});

// Mutation（データ更新）
const queryClient = useQueryClient();
const setupMutation = useMutation({
  mutationFn: (data) => client.api.users.setup.$post({ form: data }),
  onSuccess: (data) => {
    // 成功時の処理
    // キャッシュ無効化
    queryClient.invalidateQueries({ queryKey: users.setupCheck.queryKey });
  },
  onError: (error) => {
    // ClientError を使用したエラーハンドリング
    if (error instanceof ClientError && error.status === 401) {
      // 認証エラーの処理
    }
  },
});

// ファクトリを使用したQueryKey取得
const userQueryKey = users.getUser.queryKey;
const invalidateUserQuery = () => {
  queryClient.invalidateQueries({ queryKey: userQueryKey });
};

```

### shadcn/ui コンポーネント使用方法

- shadcn/ui のコンポーネントは、`@/shadcn` ディレクトリに配置されており、必要に応じてインポートして使用します。
- コンポーネントを追加するときは`pnpm dlx shadcn-ui@latest add <component-name>`を使用して、shadcn/uiのコンポーネントを追加します。

```tsx
import { Button } from "@/shadcn/button";
const MyComponent = () => {
  return (
    <Button onClick={() => {
      // ボタンがクリックされたときの処理
    }}>
      クリック
    </Button>
  );
};
```

### Supabase Auth 使用方法

- Supabase Auth を使用してユーザー認証を行います。

```tsx
import { supabase } from "@/lib/supabase";

const signUp = async (email: string, password: string) => {
  const { user, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    // エラーハンドリング
  } else {
    // ユーザー登録成功時の処理
  }
};
```

### Context定義

- 再レンダリングを防ぐために、適宜Contextを分割して使用します。
- 例えば、認証状態は4つの独立したContextに分離されています。

### 認証フック使用方法

- ページタイプ別の認証制御フックを提供しています。

```tsx
import { useRequireAuth, useRedirectIfAuthenticated } from "@/lib/auth-hooks";

// 認証が必要なページ
const ProtectedPage = () => {
  const { user, loading } = useRequireAuth(); // 未認証時は自動リダイレクト

  if (loading) return <div>Loading...</div>;
  return <div>Protected content</div>;
};

// 認証済みユーザーを除外するページ（ログイン画面等）
const LoginPage = () => {
  useRedirectIfAuthenticated(); // 認証済みは自動リダイレクト
  return <LoginForm />;
};
```

### フォームバリデーション（Zod）使用方法

- react-hook-form と Zod を組み合わせた厳格なバリデーションを実装しています。

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form } from "@/shadcn/form";

const formSchema = z.object({
  // フォームフィールドのスキーマ定義
  // react-hook-form と Zod を組み合わせて使用
});

const MyForm = () => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    // ここでAPI呼び出しなどの処理を行う
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {/* フォームフィールド */}
      </form>
    </Form>
  );
};
```

### ユーティリティ関数使用方法

- Tailwind CSSクラスの条件付き結合には `cn` 関数を使用します。

```tsx
import { cn } from "@/lib/utils";

const Button = ({ className, variant, ...props }) => {
  return (
    <button
      className={cn(
        "base-button-styles",
        {
          "primary-styles": variant === "primary",
          "secondary-styles": variant === "secondary",
        },
        className
      )}
      {...props}
    />
  );
};
```

## テスト

- コンポーネントテスト: `vitest`, `@testing-library/react` を使用
- e2eテスト: `playwright` を使用

## デプロイメント

### Cloudflare Workers

[OpenNext](https://opennext.js.org/cloudflare) を使用して、Cloudflare Workers 上にデプロイします。

1. `../../infra/cloudflare/dashboard/wrangler.toml` を確認し、
   - `NEXT_INC_CACHE_R2_BUCKET` のバケット名を確認
1. `pnpm cf:preview` でローカルプレビュー
1. `pnpm wrangler r2 bucket create <bucket_name>` でR2バケットを作成
1. `pnpm cf:deploy` でデプロイ
