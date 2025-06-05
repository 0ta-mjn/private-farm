import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../trpc";
import {
  createOrganization,
  getUserOrganizations,
  getOrganizationById,
  CreateOrganizationSchema,
} from "@repo/core";
import { z } from "zod";
import {
  MembershipCreationError,
  OrganizationCreationError,
} from "@repo/config";

export const organizationRouter = {
  // 新しい組織を作成（認証が必要）
  create: protectedProcedure
    .input(CreateOrganizationSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createOrganization(ctx.db, ctx.session.user.id, input);
      } catch (error) {
        console.error("Organization creation error:", error);

        // ビジネスエラーをtRPCエラーに変換
        if (
          error instanceof OrganizationCreationError ||
          error instanceof MembershipCreationError
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
} satisfies TRPCRouterRecord;
