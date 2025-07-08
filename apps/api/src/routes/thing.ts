import {
  createThing,
  getThingsByOrganization,
  getThingById,
  updateThing,
  deleteThing,
  CreateThingInputSchema,
  UpdateThingInputSchema,
  ThingParamsSchema,
  ValidationError,
} from "@repo/core";
import { OrganizationMembershipMiddleware } from "../middleware/organization";
import { z } from "zod";
import { Hono } from "hono";
import { AuthenticatedEnv } from "../env";
import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";

const thingRoute = new Hono<AuthenticatedEnv>()

  /**
   * Get things list by organization (requires authentication and organization membership)
   */
  .get(
    "/list/:organizationId",
    zValidator("param", z.object({ organizationId: z.string() })),
    OrganizationMembershipMiddleware(),
    async (c) => {
      const { organizationId } = c.req.valid("param");

      try {
        const things = await getThingsByOrganization(c.var.db, organizationId);
        return c.json(things);
      } catch (error) {
        console.error("Thing list error:", error);

        throw new HTTPException(500, {
          message: "ほ場一覧の取得中にエラーが発生しました",
        });
      }
    }
  )

  /**
   * Get thing detail (requires authentication and organization membership)
   */
  .get(
    "/detail/:organizationId/:thingId",
    zValidator("param", ThingParamsSchema),
    OrganizationMembershipMiddleware(),
    async (c) => {
      const input = c.req.valid("param");

      try {
        const thing = await getThingById(c.var.db, input);
        if (!thing) {
          throw new HTTPException(404, {
            message: "ほ場が見つからないか、アクセス権限がありません",
          });
        }
        return c.json(thing);
      } catch (error) {
        console.error("Thing detail error:", error);

        if (error instanceof HTTPException) {
          throw error;
        }

        throw new HTTPException(500, {
          message: "ほ場詳細の取得中にエラーが発生しました",
        });
      }
    }
  )

  /**
   * Create thing (requires authentication and organization membership)
   */
  .post(
    "/create/:organizationId",
    zValidator("param", z.object({ organizationId: z.string() })),
    zValidator("json", CreateThingInputSchema),
    OrganizationMembershipMiddleware(),
    async (c) => {
      const input = c.req.valid("json");

      try {
        const thing = await createThing(c.var.db, input);
        if (!thing) {
          throw new HTTPException(500, {
            message: "ほ場の作成に失敗しました",
          });
        }
        return c.json(thing);
      } catch (error) {
        console.error("Thing creation error:", error);

        if (error instanceof HTTPException) {
          throw error;
        }

        if (error instanceof ValidationError) {
          throw new HTTPException(400, {
            message: error.message,
          });
        }

        // 一意制約違反の処理
        if (
          error instanceof Error &&
          error.message.includes("UNIQUE constraint")
        ) {
          throw new HTTPException(409, {
            message:
              "データの重複が発生しました。しばらく待ってから再試行してください。",
          });
        }

        throw new HTTPException(500, {
          message: "ほ場の作成中にエラーが発生しました",
        });
      }
    }
  )

  /**
   * Update thing (requires authentication and organization membership)
   */
  .put(
    "/update/:organizationId/:thingId",
    zValidator("param", ThingParamsSchema),
    zValidator("json", UpdateThingInputSchema),
    OrganizationMembershipMiddleware(),
    async (c) => {
      const params = c.req.valid("param");
      const updateData = c.req.valid("json");
      const input = { ...params, ...updateData };

      try {
        const thing = await updateThing(c.var.db, input);
        if (!thing) {
          throw new HTTPException(404, {
            message: "ほ場が見つからないか、更新権限がありません",
          });
        }
        return c.json(thing);
      } catch (error) {
        console.error("Thing update error:", error);

        if (error instanceof HTTPException) {
          throw error;
        }

        if (error instanceof ValidationError) {
          throw new HTTPException(400, {
            message: error.message,
          });
        }

        throw new HTTPException(500, {
          message: "ほ場の更新中にエラーが発生しました",
        });
      }
    }
  )

  /**
   * Delete thing (requires authentication and organization membership)
   */
  .delete(
    "/delete/:organizationId/:thingId",
    zValidator("param", ThingParamsSchema),
    OrganizationMembershipMiddleware(),
    async (c) => {
      const input = c.req.valid("param");

      try {
        const result = await deleteThing(c.var.db, input);

        if (!result) {
          throw new HTTPException(404, {
            message: "ほ場が見つからないか、削除権限がありません",
          });
        }

        return c.json({ success: true });
      } catch (error) {
        console.error("Thing deletion error:", error);

        if (error instanceof HTTPException) {
          throw error;
        }

        throw new HTTPException(500, {
          message: "ほ場の削除中にエラーが発生しました",
        });
      }
    }
  );

export { thingRoute };
