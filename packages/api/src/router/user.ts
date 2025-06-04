import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../trpc";
import {
  getUserById,
  setupUserAndOrganization,
  SetupSchema,
  UserCreationError,
  OrganizationCreationError,
} from "@repo/core";

export const userRouter = {
  // 現在のユーザー情報を取得（認証が必要）
  me: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await getUserById(ctx.db, ctx.session.user.id);
    } catch {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "ユーザー情報の取得に失敗しました",
      });
    }
  }),

  // 初期設定処理（認証が必要）
  setup: protectedProcedure
    .input(SetupSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await setupUserAndOrganization(
          ctx.db,
          ctx.session.user.id,
          input
        );
      } catch (error) {
        console.error("Setup error:", error);

        // ビジネスエラーをtRPCエラーに変換
        if (
          error instanceof UserCreationError ||
          error instanceof OrganizationCreationError
        ) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error.message,
          });
        }

        // PostgreSQLの一意制約違反
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
