import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../trpc";
import {
  createDiary,
  getDiary,
  updateDiary,
  deleteDiary,
  getDiariesByDate,
  getDiariesByMonth,
  searchDiaries,
  CreateDiaryInputSchema,
  UpdateDiaryInputSchema,
  GetDiariesByDateInputSchema,
  GetDiariesByMonthInputSchema,
  SearchDiariesInputSchema,
  DiaryParamsSchema,
  UnauthorizedError,
  ValidationError,
} from "@repo/core";
import { guardOrganizationMembership } from "../guard/organization";

export const diaryRouter = {
  // 日誌詳細取得（認証が必要）
  detail: protectedProcedure
    .input(DiaryParamsSchema)
    .query(async ({ ctx, input }) => {
      // 組織メンバーシップをチェック
      await guardOrganizationMembership(
        ctx.db,
        ctx.session.user.id,
        input.organizationId
      );

      try {
        const diary = await getDiary(ctx.db, input);

        if (!diary) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "日誌が見つからないか、アクセス権限がありません",
          });
        }

        return diary;
      } catch (error) {
        console.error("Diary detail error:", error);

        if (error instanceof UnauthorizedError) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: error.message,
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "日誌の詳細取得に失敗しました",
        });
      }
    }),

  // 日誌作成（認証が必要）
  create: protectedProcedure
    .input(CreateDiaryInputSchema)
    .mutation(async ({ ctx, input }) => {
      // 組織メンバーシップをチェック
      await guardOrganizationMembership(
        ctx.db,
        ctx.session.user.id,
        input.organizationId
      );

      try {
        const diary = await createDiary(ctx.db, ctx.session.user.id, input);
        if (!diary) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "日誌の作成に失敗しました",
          });
        }
        return diary;
      } catch (error) {
        console.error("Diary creation error:", error);

        // ビジネスエラーをtRPCエラーに変換
        if (error instanceof UnauthorizedError) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: error.message,
          });
        }

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "日誌の作成中にエラーが発生しました",
        });
      }
    }),

  // 日誌更新（認証が必要）
  update: protectedProcedure
    .input(DiaryParamsSchema.merge(UpdateDiaryInputSchema))
    .mutation(async ({ ctx, input }) => {
      // 組織メンバーシップをチェック
      await guardOrganizationMembership(
        ctx.db,
        ctx.session.user.id,
        input.organizationId
      );

      try {
        const { diaryId, organizationId, ...updateData } = input;
        const diary = await updateDiary(
          ctx.db,
          ctx.session.user.id,
          { diaryId, organizationId },
          updateData
        );
        if (!diary) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "日誌が見つからないか、更新権限がありません",
          });
        }
        return diary;
      } catch (error) {
        console.error("Diary update error:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        if (error instanceof UnauthorizedError) {
          throw new TRPCError({
            code: "FORBIDDEN",
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
          message: "日誌の更新中にエラーが発生しました",
        });
      }
    }),

  // 日誌削除（認証が必要）
  delete: protectedProcedure
    .input(DiaryParamsSchema)
    .mutation(async ({ ctx, input }) => {
      // 組織メンバーシップをチェック
      await guardOrganizationMembership(
        ctx.db,
        ctx.session.user.id,
        input.organizationId
      );

      try {
        const result = await deleteDiary(ctx.db, ctx.session.user.id, input);

        if (!result) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "日誌が見つからないか、削除権限がありません",
          });
        }

        return { success: true };
      } catch (error) {
        console.error("Diary deletion error:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        if (error instanceof UnauthorizedError) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: error.message,
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "日誌の削除中にエラーが発生しました",
        });
      }
    }),

  // 指定日の日誌フルデータ取得
  byDate: protectedProcedure
    .input(GetDiariesByDateInputSchema)
    .query(async ({ ctx, input }) => {
      // 組織メンバーシップをチェック
      await guardOrganizationMembership(
        ctx.db,
        ctx.session.user.id,
        input.organizationId
      );

      try {
        return await getDiariesByDate(ctx.db, input);
      } catch (error) {
        console.error("Diaries by date error:", error);

        if (error instanceof UnauthorizedError) {
          throw new TRPCError({
            code: "FORBIDDEN",
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
          message: "指定日の日誌取得に失敗しました",
        });
      }
    }),

  // 指定月の日誌サマリーデータ取得
  byMonth: protectedProcedure
    .input(GetDiariesByMonthInputSchema)
    .query(async ({ ctx, input }) => {
      // 組織メンバーシップをチェック
      await guardOrganizationMembership(
        ctx.db,
        ctx.session.user.id,
        input.organizationId
      );

      try {
        return await getDiariesByMonth(ctx.db, input);
      } catch (error) {
        console.error("Diaries by month error:", error);

        if (error instanceof UnauthorizedError) {
          throw new TRPCError({
            code: "FORBIDDEN",
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
          message: "指定月の日誌取得に失敗しました",
        });
      }
    }),

  // 高機能検索エンドポイント
  search: protectedProcedure
    .input(SearchDiariesInputSchema)
    .query(async ({ ctx, input }) => {
      // 組織メンバーシップをチェック
      await guardOrganizationMembership(
        ctx.db,
        ctx.session.user.id,
        input.organizationId
      );

      try {
        return await searchDiaries(ctx.db, input);
      } catch (error) {
        console.error("Diary search error:", error);

        if (error instanceof UnauthorizedError) {
          throw new TRPCError({
            code: "FORBIDDEN",
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
          message: "日誌検索に失敗しました",
        });
      }
    }),
} satisfies TRPCRouterRecord;
