import { OrganizationMembershipMiddleware } from "../middleware/organization";
import { z } from "zod";
import { Hono } from "hono";
import { AuthenticatedEnv } from "../env";
import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import {
  CreateThingInput,
  UpdateThingInput,
  ThingParams,
} from "@repo/dashboard-db/interfaces";

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

      const things =
        await c.var.dashboardDB.thing.listByOrganizationId(organizationId);
      return c.json(things);
    }
  )

  /**
   * Get thing detail (requires authentication and organization membership)
   */
  .get(
    "/detail/:organizationId/:thingId",
    zValidator("param", ThingParams),
    OrganizationMembershipMiddleware(),
    async (c) => {
      const input = c.req.valid("param");

      const thing = await c.var.dashboardDB.thing.findById(input);

      if (!thing) {
        throw new HTTPException(404, {
          message: "ほ場が見つからないか、アクセス権限がありません",
        });
      }

      return c.json(thing);
    }
  )

  /**
   * Create thing (requires authentication and organization membership)
   */
  .post(
    "/create/:organizationId",
    zValidator("param", z.object({ organizationId: z.string() })),
    zValidator("json", CreateThingInput),
    OrganizationMembershipMiddleware(),
    async (c) => {
      const input = c.req.valid("json");

      const thing = await c.var.dashboardDB.thing.create(input);

      return c.json(thing);
    }
  )

  /**
   * Update thing (requires authentication and organization membership)
   */
  .put(
    "/update/:organizationId/:thingId",
    zValidator("param", ThingParams),
    zValidator("json", UpdateThingInput),
    OrganizationMembershipMiddleware(),
    async (c) => {
      const params = c.req.valid("param");
      const updateData = c.req.valid("json");

      const thing = await c.var.dashboardDB.thing.update(params, updateData);

      return c.json(thing);
    }
  )

  /**
   * Delete thing (requires authentication and organization membership)
   */
  .delete(
    "/delete/:organizationId/:thingId",
    zValidator("param", ThingParams),
    OrganizationMembershipMiddleware(),
    async (c) => {
      const input = c.req.valid("param");

      const result = await c.var.dashboardDB.thing.delete(input);

      if (!result) {
        throw new HTTPException(404, {
          message: "ほ場が見つからないか、削除権限がありません",
        });
      }

      return c.json({ success: true });
    }
  );

export { thingRoute };
