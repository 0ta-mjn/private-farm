import { z } from "zod";
import { Hono } from "hono";
import { AuthenticatedEnv } from "../env";
import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import { OrganizationMembershipMiddleware } from "../middleware/organization";
import {
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from "@repo/dashboard-db/interfaces";

const organizationRoute = new Hono<AuthenticatedEnv>()

  /**
   * Create a new organization (requires authentication)
   */
  .post("/create", zValidator("json", CreateOrganizationInput), async (c) => {
    const input = c.req.valid("json");

    const result = await c.var.dashboardDB.organization.create(
      c.var.userId,
      input
    );

    return c.json(result, 201);
  })

  /**
   * Get the list of organizations for the authenticated user
   */
  .get("/list", async (c) => {
    const organizations = await c.var.dashboardDB.organization.listByUser(
      c.var.userId
    );
    return c.json(organizations);
  })

  /**
   * Get details of a specific organization (requires authentication)
   */
  .get(
    "/detail/:organizationId",
    zValidator(
      "param",
      z.object({
        organizationId: z.string(),
      })
    ),
    async (c) => {
      const { organizationId } = c.req.valid("param");

      const organization =
        await c.var.dashboardDB.organization.findById(organizationId);

      if (!organization) {
        throw new HTTPException(404, {
          message: "組織が見つからないか、アクセス権限がありません",
        });
      }

      return c.json(organization);
    }
  )

  /**
   * Update an organization (requires authentication)
   */
  .put(
    "/update/:organizationId",
    zValidator(
      "param",
      z.object({
        organizationId: z.string(),
      })
    ),
    zValidator("json", UpdateOrganizationInput),
    OrganizationMembershipMiddleware({ role: "admin" }),
    async (c) => {
      const { organizationId } = c.req.valid("param");
      const input = c.req.valid("json");

      const organization = await c.var.dashboardDB.organization.update(
        organizationId,
        input
      );

      return c.json(organization);
    }
  )

  /**
   * Delete an organization (requires authentication and admin role)
   */
  .delete(
    "/delete/:organizationId",
    zValidator(
      "param",
      z.object({
        organizationId: z.string(),
      })
    ),
    OrganizationMembershipMiddleware({ role: "admin" }),
    async (c) => {
      const { organizationId } = c.req.valid("param");

      const deleted =
        await c.var.dashboardDB.organization.delete(organizationId);

      if (!deleted) {
        throw new HTTPException(404, {
          message: "組織が見つからないか、アクセス権限がありません",
        });
      }

      return c.json({ success: true });
    }
  );

export { organizationRoute };
