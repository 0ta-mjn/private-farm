# tRPC API サーバー

このレポジトリのゴールは小規模個人農家向けのIoT基盤システムを構築することです。

このレポジトリではturborepoを使用して、モノレポ形式で開発を行います。
パッケージマネージャはpnpmを使用し、Node.jsのバージョンは20.xを想定しています。

バックエンドはtRPCを使用してFastifyでAPIを提供します。
フロントエンドはNext.jsを使用します。

認証はsupabaseを使用し、DBはDrizzle ORMを使用したPostgreSQLとします。

## APIの構成

- **APIパッケージ**: `apps/api`
  - Fastifyを使用したサーバー実装
  - 基本的なロジックは書かず、Fastifyに依存するミドルウェアやプラグインとデプロイ設定のみを記述
- **APIパッケージ**: `packages/api`
  - tRPCクライアントとサーバーの設定を含む
  - routerの定義とエンドポイントの実装を行う
- **APIサーバー**: `packages/core`
  - APIサーバーのビジネスロジックを実装
  - `src/services`にビジネスロジックとそのテストを配置
- **DBパッケージ**: `packages/db`
  - Drizzle ORMを使用したデータベースの設定とマイグレーションを管理

## APIの実装手順

関数型プログラミングのスタイルを取り入れ、TDDを意識して実装を進めます。

1. `packages/api/src/router/`内に各エンドポイントのrouterを定義

    ```ts
    import type { TRPCRouterRecord } from "@trpc/server";
    import { TRPCError } from "@trpc/server";
    import { protectedProcedure } from "../trpc";
    import { SetupSchema, setupUserAndOrganization } from "@repo/core";

    export const userRouter = {
      setup: protectedProcedure
        .input(SetupSchema)
        .mutation(async ({ ctx, input }) => {
          // 実際の処理
          try {
            return setupUserAndOrganization(
              ctx.db,
              ctx.user.id,
              input
            );
          } catch (error) {
            // エラーハンドリング
          }
        }),
    } satisfies TRPCRouterRecord;
    ```

2. `packages/core/src/services`にビジネスロジック用の関数を配置
    - この段階では内部処理はまだ実装しない

    ```ts
    import { z } from "zod";
    import { eq, withUniqueIdRetry } from "@repo/db";
    import type { Database } from "@repo/db/client";

    export const SetupSchema = z.object({
      // バリデーションスキーマ
    });

    export type SetupInput = z.infer<typeof SetupSchema>;

    /**
     * 適切なコメントを追加してください。
    */
    export async function setupUserAndOrganization(
      db: Database,
      userId: string,
      input: SetupInput
    ) {
      return db.transaction(async (tx) => {
        // 実際の処理
      });
    }
    ```

3. ビジネスロジック関数のファイルと同じ階層にテストファイルを配置
   - テストは`vitest`を使用して実装
   - テスト実行はローカルのSupabaseエミュレータを使用
   - レポジトリのトップで`pnpm test:ci`を実行してテストを実行できる

    ```ts
    import { describe, it, beforeEach, expect } from "vitest";
    import { dbClient } from "@repo/db/client";
    import {
      organizationMembersTable,
      organizationsTable,
      usersTable,
    } from "@repo/db/schema";
    import { getUserById, setupUserAndOrganization } from "..";

    const db = dbClient();

    describe("UserService (関数型)", () => {
      beforeEach(async () => {
        // テスト用のデータベースをリセット
        await db.transaction(async (tx) => {
        });
      });

      describe("setupUserAndOrganization", () => {
        it("should create a user and organization", async () => {
          // 正常ケースのテスト
        });

        it("should handle errors gracefully", async () => {
          // エラーケースのテスト
        });

        // その他にもエッジケースなど考えられるテストケースを追加
      });
    });
    ```

4. 実際のビジネスロジックを実装
