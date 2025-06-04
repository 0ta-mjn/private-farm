import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure } from "../trpc";
import {
  getUserById,
  setupUserAndOrganization,
  checkUserSetupStatus,
  getUserSidebarData,
  getUserOrganizationDetails,
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

  // 初期設定状態確認（認証が必要）
  setupCheck: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await checkUserSetupStatus(ctx.db, ctx.session.user.id);
    } catch (error) {
      console.error("Setup check error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "初期設定状態の確認に失敗しました",
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

  // サイドバー表示用データ取得（認証が必要）
  sidebarData: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await getUserSidebarData(ctx.db, ctx.session.user.id);
    } catch (error) {
      console.error("Sidebar data error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "サイドバー情報の取得に失敗しました",
      });
    }
  }),

  // 特定の組織でのユーザー詳細情報取得（認証が必要）
  organizationDetails: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        return await getUserOrganizationDetails(
          ctx.db,
          ctx.session.user.id,
          input.organizationId
        );
      } catch (error) {
        console.error("Organization details error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "組織詳細情報の取得に失敗しました",
        });
      }
    }),
} satisfies TRPCRouterRecord;
