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
  - 基本的なビジネスロジックは`packages/core`に委譲
- **APIサーバー**: `packages/core`
  - APIサーバーのビジネスロジックを実装
  - `src/services`にビジネスロジックとそのテストを配置
- **DBパッケージ**: `packages/db`
  - Drizzle ORMを使用したデータベースの設定とマイグレーションを管理

## APIの実装手順

関数型プログラミングのスタイルを取り入れ、TDDを意識して実装を進めます。

1. `apps/api/src/routes/`内に各エンドポイントのルートを定義

    ```ts
    import { Hono } from "hono";
    import { zValidator } from "@hono/zod-validator";
    import { HTTPException } from "hono/http-exception";
    import { AuthenticatedEnv } from "../env";
    import { OrganizationMembershipMiddleware } from "../middleware/organization";
    import { SetupSchema, setupUserAndOrganization } from "@repo/core";

    const userRoute = new Hono<AuthenticatedEnv>()
      .post(
        "/setup/:organizationId",
        zValidator("param", z.object({ organizationId: z.string() })),
        zValidator("form", SetupSchema),
        OrganizationMembershipMiddleware({ role: "admin" }),
        async (c) => {
          const { organizationId } = c.req.valid("param");
          const input = c.req.valid("form");

          try {
            const result = await setupUserAndOrganization(
              c.var.db,
              c.var.userId,
              input
            );
            return c.json(result);
          } catch (error) {
            // エラーハンドリング
            throw new HTTPException(500, {
              message: "Setup failed",
            });
          }
        }
      );

    export { userRoute };
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
