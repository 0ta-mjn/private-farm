# ダッシュボード フロントエンド

このレポジトリのゴールは小規模個人農家向けのIoT基盤システムを構築することです。

このレポジトリではturborepoを使用して、モノレポ形式で開発を行います。
パッケージマネージャはpnpmを使用し、Node.jsのバージョンは20.xを想定しています。

フロントエンドはNext.jsを使用し、UIはshadcn/uiをベースにしたコンポーネントライブラリを使用します。
バックエンドはtRPCを使用してFastifyでAPIを提供します。

認証はsupabaseを使用する。

## コンフィグ

### パスエイリアス設定

- **@/**: `src/` ディレクトリのエイリアス
- **@/shadcn**: shadcn/ui コンポーネント用の専用ディレクトリ
- **@/lib**: ユーティリティ関数やライブラリ設定
- **@/trpc**: tRPC クライアント設定
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
- **tRPC設定**: "@repo/api" パッケージを使用して、tRPC クライアントとサーバーの設定を統一

## 基本的な使用パターン

### tRPC使用方法

- `@trpc/tanstack-react-query` を使用して、tRPC クライアントを React コンポーネント内で使用します。

```tsx
import { useTRPC } from "@/trpc/client";

...

// コンポーネント内でのtRPC使用
const trpc = useTRPC();

// Query（データ取得）
const queryResponse = useQuery(
  trpc.user.getUser.queryOptions()
);

// Mutation（データ更新）
const setupMutation = useMutation(
  trpc.user.setup.mutationOptions({
    onSuccess: (data) => {
      // 成功時の処理
    },
    onError: (error) => {
      // エラー時の処理
    },
  })
);

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  // Create QueryOptions which can be passed to query hooks
  const myQueryOptions = trpc.user.someRPC.query.queryOptions({ /** inputs */ }, {
    /** useQuery options */
  })
  const myQuery = useQuery(myQueryOptions)
  // or:
  // useSuspenseQuery(myQueryOptions)
  // useInfiniteQuery(myQueryOptions)
  // Create MutationOptions which can be passed to useMutation
  const myMutationOptions = trpc.user.someRPC.mutation.mutationOptions()
  const myMutation = useMutation(myMutationOptions)
  // Create a QueryKey which can be used to manipulated many methods
  // on TanStack's QueryClient in a type-safe manner
  const myQueryKey = trpc.user.someRPC.query.queryKey()
  const invalidateMyQueryKey = () => {
    queryClient.invalidateQueries({ queryKey: myQueryKey })
  }

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
