import { OrganizationMembershipMiddleware } from "../middleware/organization";
import { z } from "zod";
import { Hono } from "hono";
import { AuthenticatedEnv } from "../env";
import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import {
  DiaryParams,
  CreateDiaryInput,
  UpdateDiaryInput,
  GetDiariesByDateInput,
  GetDiariesByDateRangeInput,
  SearchDiariesInput,
} from "@repo/dashboard-db/interfaces";

const diaryRoute = new Hono<AuthenticatedEnv>()

  /**
   * Get diary detail (requires authentication and organization membership)
   */
  .get(
    "/detail/:organizationId/:diaryId",
    zValidator("param", DiaryParams),
    OrganizationMembershipMiddleware(),
    async (c) => {
      const input = c.req.valid("param");

      const diary = await c.var.dashboardDB.diary.findById(input);

      if (!diary) {
        throw new HTTPException(404, {
          message: "日誌が見つからないか、アクセス権限がありません",
        });
      }

      return c.json(diary);
    }
  )

  /**
   * Create diary (requires authentication and organization membership)
   */
  .post(
    "/create/:organizationId",
    zValidator("param", z.object({ organizationId: z.string() })),
    zValidator("json", CreateDiaryInput),
    OrganizationMembershipMiddleware(),
    async (c) => {
      const { organizationId } = c.req.valid("param");
      const input = c.req.valid("json");

      const diary = await c.var.dashboardDB.diary.create(
        { userId: c.var.userId, organizationId },
        input
      );
      return c.json(diary);
    }
  )

  /**
   * Update diary (requires authentication and organization membership)
   */
  .put(
    "/update/:organizationId/:diaryId",
    zValidator("param", DiaryParams),
    zValidator("json", UpdateDiaryInput),
    OrganizationMembershipMiddleware(),
    async (c) => {
      const params = c.req.valid("param");
      const updateData = c.req.valid("json");

      const diary = await c.var.dashboardDB.diary.update(params, updateData);
      return c.json(diary);
    }
  )

  /**
   * Delete diary (requires authentication and organization membership)
   */
  .delete(
    "/delete/:organizationId/:diaryId",
    zValidator("param", DiaryParams),
    OrganizationMembershipMiddleware(),
    async (c) => {
      const input = c.req.valid("param");

      const result = await c.var.dashboardDB.diary.delete(input);

      if (!result) {
        throw new HTTPException(404, {
          message: "日誌が見つからないか、削除権限がありません",
        });
      }

      return c.json({ success: true });
    }
  )

  /**
   * Get diaries by date (requires authentication and organization membership)
   */
  .get(
    "/by-date/:organizationId",
    zValidator("param", z.object({ organizationId: z.string() })),
    zValidator("query", GetDiariesByDateInput),
    OrganizationMembershipMiddleware(),
    async (c) => {
      const { organizationId } = c.req.valid("param");
      const input = c.req.valid("query");

      const diaries = await c.var.dashboardDB.diary.findByDate(
        organizationId,
        input
      );
      return c.json(diaries);
    }
  )

  /**
   * Search diaries (requires authentication and organization membership)
   */
  .get(
    "/search/:organizationId",
    zValidator("param", z.object({ organizationId: z.string() })),
    zValidator("query", SearchDiariesInput),
    OrganizationMembershipMiddleware(),
    async (c) => {
      const { organizationId } = c.req.valid("param");
      const input = c.req.valid("query");

      const results = await c.var.dashboardDB.diary.search(
        organizationId,
        input
      );
      return c.json(results);
    }
  )

  /**
   * Get diaries by date range (requires authentication and organization membership)
   */
  .get(
    "/by-date-range/:organizationId",
    zValidator("param", z.object({ organizationId: z.string() })),
    zValidator("query", GetDiariesByDateRangeInput, undefined, {
      validationFunction: (schema, input) => {
        const result = schema.safeParse(input);
        if (!result.success) {
          return result;
        }

        // 40日制限をvalidationFunctionで実装
        const start = new Date(result.data.startDate);
        const end = new Date(result.data.endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 40) {
          throw new HTTPException(400, {
            message: "期間は最大40日までです",
          });
        }

        return result;
      },
    }),
    OrganizationMembershipMiddleware(),
    async (c) => {
      const { organizationId } = c.req.valid("param");
      const input = c.req.valid("query");

      const diaries = await c.var.dashboardDB.diary.findByDateRange(
        organizationId,
        input
      );

      return c.json(diaries);
    }
  );

export { diaryRoute };
