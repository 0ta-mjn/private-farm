import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, createWithUUIDRetry } from "@repo/db";
import { protectedProcedure } from "../trpc";
import {
  usersTable,
  organizationsTable,
  organizationMembersTable,
  MemberRoleSchema,
} from "@repo/db/schema";
import { DEFAULT_UUID_CONFIG } from "@repo/config";

// 初期設定のためのスキーマ
const setupSchema = z.object({
  userName: z
    .string()
    .min(2, "ユーザー名は2文字以上で入力してください")
    .max(50, "ユーザー名は50文字以下で入力してください"),
  organizationName: z
    .string()
    .min(1, "組織名を入力してください")
    .max(100, "組織名は100文字以下で入力してください"),
});

export const userRouter = {
  // 現在のユーザー情報を取得（認証が必要）
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, ctx.session.user.id))
      .limit(1);

    return user[0] || null;
  }),

  // 初期設定処理（認証が必要）
  setup: protectedProcedure
    .input(setupSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      try {
        // トランザクション内で処理を実行
        return await ctx.db.transaction(async (tx) => {
          // ユーザーが既に存在するかチェック
          const existingUser = await tx
            .select()
            .from(usersTable)
            .where(eq(usersTable.id, userId))
            .limit(1);

          if (existingUser.length > 0) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "ユーザーは既に設定済みです",
            });
          }

          // 組織とメンバーシップを作成
          const organizationResult = await createWithUUIDRetry(
            (organizationId) =>
              tx
                .insert(organizationsTable)
                .values({
                  id: organizationId,
                  name: input.organizationName,
                  description: `${input.organizationName}の組織`,
                })
                .returning(),
            { idPrefix: DEFAULT_UUID_CONFIG.organization.idPrefix }
          );

          const organization = organizationResult[0];
          if (!organization) {
            throw new Error("組織の作成に失敗しました");
          }

          // ユーザーを作成
          await tx.insert(usersTable).values({
            id: userId,
            name: input.userName,
          });

          // ユーザーを組織のadminとして追加
          await createWithUUIDRetry(
            (membershipId) =>
              tx
                .insert(organizationMembersTable)
                .values({
                  id: membershipId,
                  userId: userId,
                  organizationId: organization.id,
                  role: MemberRoleSchema.enum.admin, // 管理者として追加
                })
                .returning(),
            { idPrefix: DEFAULT_UUID_CONFIG.organization.idPrefix }
          );

          return {
            success: true,
            user: {
              id: userId,
              name: input.userName,
            },
            organization: {
              id: organization.id,
              name: input.organizationName,
            },
          };
        });
      } catch (error) {
        console.error("Setup error:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        // PostgreSQLの一意制約違反をより具体的に処理
        if (error && typeof error === "object" && "code" in error) {
          if (error.code === "23505") {
            throw new TRPCError({
              code: "CONFLICT",
              message:
                "データの重複が発生しました。しばらく待ってから再試行してください。",
            });
          }
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "初期設定中にエラーが発生しました",
        });
      }
    }),
} satisfies TRPCRouterRecord;
