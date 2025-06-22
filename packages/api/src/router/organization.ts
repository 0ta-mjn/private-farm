import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../trpc";
import {
  createOrganization,
  getUserOrganizations,
  getOrganizationById,
  updateOrganization,
  deleteOrganization,
  CreateOrganizationSchema,
  UpdateOrganizationSchema,
  MembershipCreationError,
} from "@repo/core";
import { z } from "zod";
import { guardOrganizationMembership } from "../guard/organization";

export const organizationRouter = {
  // 新しい組織を作成（認証が必要）
  create: protectedProcedure
    .input(CreateOrganizationSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const organization = await createOrganization(
          ctx.db,
          ctx.session.user.id,
          input
        );
        if (!organization) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "組織の作成に失敗しました",
          });
        }

        return organization;
      } catch (error) {
        console.error("Organization creation error:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        // ビジネスエラーをtRPCエラーに変換
        if (error instanceof MembershipCreationError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error.message,
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "組織の作成中にエラーが発生しました",
        });
      }
    }),

  // ユーザーの組織一覧を取得（認証が必要）
  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await getUserOrganizations(ctx.db, ctx.session.user.id);
    } catch (error) {
      console.error("Get user organizations error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "組織の一覧取得に失敗しました",
      });
    }
  }),

  // 特定の組織の詳細を取得（認証が必要）
  getById: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const organization = await getOrganizationById(
          ctx.db,
          input.organizationId,
          ctx.session.user.id
        );

        if (!organization) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "組織が見つからないか、アクセス権限がありません",
          });
        }

        return organization;
      } catch (error) {
        console.error("Get organization error:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "組織の詳細取得に失敗しました",
        });
      }
    }),

  // 組織を更新（認証が必要）
  update: protectedProcedure
    .input(
      z
        .object({
          organizationId: z.string(),
        })
        .merge(UpdateOrganizationSchema)
    )
    .mutation(async ({ ctx, input }) => {
      // 組織メンバーシップをチェック
      await guardOrganizationMembership(
        ctx.db,
        ctx.session.user.id,
        input.organizationId,
        "admin"
      );

      try {
        const { organizationId, ...updateData } = input;
        const organization = await updateOrganization(
          ctx.db,
          organizationId,
          ctx.session.user.id,
          updateData
        );
        if (!organization) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "組織が見つからないか、アクセス権限がありません",
          });
        }
        return organization;
      } catch (error) {
        console.error("Organization update error:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "組織の更新中にエラーが発生しました",
        });
      }
    }),

  // 組織を削除（認証が必要、管理者権限が必要）
  delete: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const deleted = await deleteOrganization(ctx.db, input.organizationId);
        if (!deleted) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "組織が見つからないか、アクセス権限がありません",
          });
        }
        return { success: true };
      } catch (error) {
        console.error("Organization deletion error:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "組織の削除中にエラーが発生しました",
        });
      }
    }),
} satisfies TRPCRouterRecord;
