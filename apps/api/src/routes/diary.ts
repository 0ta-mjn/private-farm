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
import { OrganizationMembershipMiddleware } from "../middleware/organization";
import { z } from "zod";
import { Hono } from "hono";
import { AuthenticatedEnv } from "../env";
import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";

const diaryRoute = new Hono<AuthenticatedEnv>()

  /**
   * Get diary detail (requires authentication and organization membership)
   */
  .get(
    "/detail/:organizationId/:diaryId",
    zValidator("param", DiaryParamsSchema),
    OrganizationMembershipMiddleware(),
    async (c) => {
      const input = c.req.valid("param");

      try {
        const diary = await getDiary(c.var.db, input);

        if (!diary) {
          throw new HTTPException(404, {
            message: "日誌が見つからないか、アクセス権限がありません",
          });
        }

        return c.json(diary);
      } catch (error) {
        console.error("Diary detail error:", error);

        if (error instanceof HTTPException) {
          throw error;
        }

        if (error instanceof UnauthorizedError) {
          throw new HTTPException(403, {
            message: error.message,
          });
        }

        throw new HTTPException(500, {
          message: "日誌の詳細取得に失敗しました",
        });
      }
    }
  )

  /**
   * Create diary (requires authentication and organization membership)
   */
  .post(
    "/create/:organizationId",
    zValidator("param", z.object({ organizationId: z.string() })),
    zValidator("json", CreateDiaryInputSchema),
    OrganizationMembershipMiddleware(),
    async (c) => {
      const { organizationId } = c.req.valid("param");
      const input = c.req.valid("json");

      try {
        const diary = await createDiary(
          c.var.db,
          c.var.userId,
          organizationId,
          input
        );
        if (!diary) {
          throw new HTTPException(500, {
            message: "日誌の作成に失敗しました",
          });
        }
        return c.json(diary);
      } catch (error) {
        console.error("Diary creation error:", error);

        if (error instanceof HTTPException) {
          throw error;
        }

        // ビジネスエラーをHTTPExceptionに変換
        if (error instanceof UnauthorizedError) {
          throw new HTTPException(403, {
            message: error.message,
          });
        }

        throw new HTTPException(500, {
          message: "日誌の作成中にエラーが発生しました",
        });
      }
    }
  )

  /**
   * Update diary (requires authentication and organization membership)
   */
  .put(
    "/update/:organizationId/:diaryId",
    zValidator("param", DiaryParamsSchema),
    zValidator("json", UpdateDiaryInputSchema),
    OrganizationMembershipMiddleware(),
    async (c) => {
      const params = c.req.valid("param");
      const updateData = c.req.valid("json");

      try {
        const diary = await updateDiary(
          c.var.db,
          c.var.userId,
          params,
          updateData
        );
        if (!diary) {
          throw new HTTPException(404, {
            message: "日誌が見つからないか、更新権限がありません",
          });
        }
        return c.json(diary);
      } catch (error) {
        console.error("Diary update error:", error);

        if (error instanceof HTTPException) {
          throw error;
        }

        if (error instanceof UnauthorizedError) {
          throw new HTTPException(403, {
            message: error.message,
          });
        }

        if (error instanceof ValidationError) {
          throw new HTTPException(400, {
            message: error.message,
          });
        }

        throw new HTTPException(500, {
          message: "日誌の更新中にエラーが発生しました",
        });
      }
    }
  )

  /**
   * Delete diary (requires authentication and organization membership)
   */
  .delete(
    "/delete/:organizationId/:diaryId",
    zValidator("param", DiaryParamsSchema),
    OrganizationMembershipMiddleware(),
    async (c) => {
      const input = c.req.valid("param");

      try {
        const result = await deleteDiary(c.var.db, c.var.userId, input);

        if (!result) {
          throw new HTTPException(404, {
            message: "日誌が見つからないか、削除権限がありません",
          });
        }

        return c.json({ success: true });
      } catch (error) {
        console.error("Diary deletion error:", error);

        if (error instanceof HTTPException) {
          throw error;
        }

        if (error instanceof UnauthorizedError) {
          throw new HTTPException(403, {
            message: error.message,
          });
        }

        throw new HTTPException(500, {
          message: "日誌の削除中にエラーが発生しました",
        });
      }
    }
  )

  /**
   * Get diaries by date (requires authentication and organization membership)
   */
  .get(
    "/by-date/:organizationId",
    zValidator("param", z.object({ organizationId: z.string() })),
    zValidator("query", GetDiariesByDateInputSchema),
    OrganizationMembershipMiddleware(),
    async (c) => {
      const { organizationId } = c.req.valid("param");
      const input = c.req.valid("query");

      try {
        const diaries = await getDiariesByDate(c.var.db, organizationId, input);
        return c.json(diaries);
      } catch (error) {
        console.error("Diaries by date error:", error);

        if (error instanceof HTTPException) {
          throw error;
        }

        if (error instanceof UnauthorizedError) {
          throw new HTTPException(403, {
            message: error.message,
          });
        }

        if (error instanceof ValidationError) {
          throw new HTTPException(400, {
            message: error.message,
          });
        }

        throw new HTTPException(500, {
          message: "指定日の日誌取得に失敗しました",
        });
      }
    }
  )

  /**
   * Get diaries by month (requires authentication and organization membership)
   */
  .get(
    "/by-month/:organizationId",
    zValidator("param", z.object({ organizationId: z.string() })),
    zValidator("query", GetDiariesByMonthInputSchema, undefined, {
      validationFunction: (schema, input) => {
        try {
          if (
            typeof input.year !== "string" ||
            typeof input.month !== "string"
          ) {
            throw new ValidationError("年と月は文字列で指定してください");
          }
          const year = parseInt(input.year, 10);
          const month = parseInt(input.month, 10);
          return schema.safeParse({ year: year, month: month });
        } catch {
          throw new ValidationError("年と月は数値で指定してください");
        }
      },
    }),
    OrganizationMembershipMiddleware(),
    async (c) => {
      const { organizationId } = c.req.valid("param");
      const input = c.req.valid("query");

      try {
        const diaries = await getDiariesByMonth(
          c.var.db,
          organizationId,
          input
        );
        return c.json(diaries);
      } catch (error) {
        console.error("Diaries by month error:", error);

        if (error instanceof HTTPException) {
          throw error;
        }

        if (error instanceof UnauthorizedError) {
          throw new HTTPException(403, {
            message: error.message,
          });
        }

        if (error instanceof ValidationError) {
          throw new HTTPException(400, {
            message: error.message,
          });
        }

        throw new HTTPException(500, {
          message: "指定月の日誌取得に失敗しました",
        });
      }
    }
  )

  /**
   * Search diaries (requires authentication and organization membership)
   */
  .get(
    "/search/:organizationId",
    zValidator("param", z.object({ organizationId: z.string() })),
    zValidator("query", SearchDiariesInputSchema),
    OrganizationMembershipMiddleware(),
    async (c) => {
      const { organizationId } = c.req.valid("param");
      const input = c.req.valid("query");

      try {
        const results = await searchDiaries(c.var.db, organizationId, input);
        return c.json(results);
      } catch (error) {
        console.error("Diary search error:", error);

        if (error instanceof HTTPException) {
          throw error;
        }

        if (error instanceof UnauthorizedError) {
          throw new HTTPException(403, {
            message: error.message,
          });
        }

        if (error instanceof ValidationError) {
          throw new HTTPException(400, {
            message: error.message,
          });
        }

        throw new HTTPException(500, {
          message: "日誌検索に失敗しました",
        });
      }
    }
  );

export { diaryRoute };
