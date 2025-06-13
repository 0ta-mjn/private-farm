import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../trpc";
import {
  createThing,
  getThingsByOrganization,
  getThingById,
  updateThing,
  deleteThing,
  CreateThingInputSchema,
  UpdateThingInputSchema,
  ThingParamsSchema,
} from "@repo/core";
import {
  NotFoundError,
  ThingCreationError,
  ThingUpdateError,
  ValidationError,
} from "@repo/config";
import { guardOrganizationMembership } from "../guard/organization";
import { z } from "zod";

export const thingRouter = {
  // ほ場一覧取得（認証が必要）
  list: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      // 組織メンバーシップをチェック
      await guardOrganizationMembership(
        ctx.db,
        ctx.session.user.id,
        input.organizationId
      );

      try {
        return await getThingsByOrganization(ctx.db, input.organizationId);
      } catch (error) {
        console.error("Thing list error:", error);

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "ほ場一覧の取得中にエラーが発生しました",
        });
      }
    }),

  // ほ場詳細取得（認証が必要）
  detail: protectedProcedure
    .input(ThingParamsSchema)
    .query(async ({ ctx, input }) => {
      // 組織メンバーシップをチェック
      await guardOrganizationMembership(
        ctx.db,
        ctx.session.user.id,
        input.organizationId
      );

      try {
        return await getThingById(ctx.db, input);
      } catch (error) {
        console.error("Thing detail error:", error);

        // ビジネスエラーをtRPCエラーに変換
        if (error instanceof NotFoundError) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "ほ場詳細の取得中にエラーが発生しました",
        });
      }
    }),

  // ほ場作成（認証が必要）
  create: protectedProcedure
    .input(CreateThingInputSchema)
    .mutation(async ({ ctx, input }) => {
      // 組織メンバーシップをチェック
      await guardOrganizationMembership(
        ctx.db,
        ctx.session.user.id,
        input.organizationId
      );

      try {
        return await createThing(ctx.db, input);
      } catch (error) {
        console.error("Thing creation error:", error);

        // ビジネスエラーをtRPCエラーに変換
        if (error instanceof ThingCreationError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error.message,
          });
        }

        if (error instanceof ValidationError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }

        // 一意制約違反の処理
        if (
          error instanceof Error &&
          error.message.includes("UNIQUE constraint")
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "データの重複が発生しました。しばらく待ってから再試行してください。",
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "ほ場の作成中にエラーが発生しました",
        });
      }
    }),

  // ほ場更新（認証が必要）
  update: protectedProcedure
    .input(ThingParamsSchema.merge(UpdateThingInputSchema))
    .mutation(async ({ ctx, input }) => {
      // 組織メンバーシップをチェック
      await guardOrganizationMembership(
        ctx.db,
        ctx.session.user.id,
        input.organizationId
      );

      try {
        return await updateThing(ctx.db, input);
      } catch (error) {
        console.error("Thing update error:", error);

        // ビジネスエラーをtRPCエラーに変換
        if (error instanceof NotFoundError) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }

        if (error instanceof ThingUpdateError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error.message,
          });
        }

        if (error instanceof ValidationError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "ほ場の更新中にエラーが発生しました",
        });
      }
    }),

  // ほ場削除（認証が必要）
  delete: protectedProcedure
    .input(ThingParamsSchema)
    .mutation(async ({ ctx, input }) => {
      // 組織メンバーシップをチェック
      await guardOrganizationMembership(
        ctx.db,
        ctx.session.user.id,
        input.organizationId
      );

      try {
        const result = await deleteThing(ctx.db, input);

        if (!result) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "ほ場が見つからないか、削除権限がありません",
          });
        }

        return { success: true };
      } catch (error) {
        console.error("Thing deletion error:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        if (error instanceof NotFoundError) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "ほ場の削除中にエラーが発生しました",
        });
      }
    }),
} satisfies TRPCRouterRecord;
