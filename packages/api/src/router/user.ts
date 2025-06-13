import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../trpc";
import {
  getUserById,
  setupUserAndOrganization,
  checkUserSetupStatus,
  getUserSidebarData,
  updateOrganizationLatestViewedAt,
  updateUserProfile,
  deleteUserAccount,
  SetupSchema,
} from "@repo/core";
import {
  UserCreationError,
  OrganizationCreationError,
  UserDeletionError,
} from "@repo/config";
import { deleteSupabaseUser } from "@repo/supabase";
import { z } from "zod";

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

  // 組織の最後閲覧日時を更新（認証が必要）
  updateOrganizationViewed: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await updateOrganizationLatestViewedAt(
          ctx.db,
          ctx.session.user.id,
          input.organizationId
        );
        return { success: true };
      } catch (error) {
        console.error("Update organization viewed error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "組織閲覧日時の更新に失敗しました",
        });
      }
    }),

  // プロフィール更新（認証が必要）
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z
          .string()
          .min(1, "名前は必須です")
          .max(50, "名前は50文字以内で入力してください"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const updatedUser = await updateUserProfile(
          ctx.db,
          ctx.session.user.id,
          input
        );

        if (!updatedUser) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "ユーザーが見つかりません",
          });
        }

        return updatedUser;
      } catch (error) {
        console.error("Update profile error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "プロフィールの更新に失敗しました",
        });
      }
    }),

  // アカウント削除（認証が必要）
  deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      // データベースからユーザーデータを削除
      const deleted = await deleteUserAccount(ctx.db, ctx.session.user.id);

      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "ユーザーが見つかりません",
        });
      }

      // Supabaseからユーザーを削除
      try {
        await deleteSupabaseUser(ctx.supabase, ctx.session.user.id);
      } catch (supabaseError) {
        console.error("Supabase user deletion failed:", supabaseError);
        // Supabaseの削除が失敗してもデータベースの削除は成功しているため、
        // ログのみ記録してエラーは継続しない
      }

      return { success: true, message: "アカウントが正常に削除されました" };
    } catch (error) {
      console.error("Delete account error:", error);

      // ビジネスエラーをtRPCエラーに変換
      if (error instanceof UserDeletionError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "アカウントの削除中にエラーが発生しました",
      });
    }
  }),
} satisfies TRPCRouterRecord;
