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
import { Hono } from "hono";
import { AuthenticatedEnv } from "../env";
import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import { OrganizationMembershipMiddleware } from "../middleware/organization";

const organizationRoute = new Hono<AuthenticatedEnv>()

  /**
   * Create a new organization (requires authentication)
   */
  .post("/create", zValidator("json", CreateOrganizationSchema), async (c) => {
    const input = c.req.valid("json");
    try {
      const organization = await createOrganization(
        c.var.db,
        c.var.userId,
        input
      );
      if (!organization) {
        throw new HTTPException(500, {
          message: "組織の作成に失敗しました",
        });
      }

      return c.json(organization, 201);
    } catch (error) {
      console.error("Organization creation error:", error);

      if (error instanceof HTTPException) {
        throw error;
      }

      // ビジネスエラーを変換
      if (error instanceof MembershipCreationError) {
        throw new HTTPException(500, {
          message: error.message,
        });
      }

      throw new HTTPException(500, {
        message: "組織の作成中にエラーが発生しました",
      });
    }
  })

  /**
   * Get the list of organizations for the authenticated user
   */
  .get("/list", async (c) => {
    try {
      const organizations = await getUserOrganizations(c.var.db, c.var.userId);
      return c.json(organizations);
    } catch (error) {
      console.error("Get user organizations error:", error);
      throw new HTTPException(500, {
        message: "組織の一覧取得に失敗しました",
      });
    }
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
      try {
        const organization = await getOrganizationById(
          c.var.db,
          organizationId,
          c.var.userId
        );

        if (!organization) {
          throw new HTTPException(404, {
            message: "組織が見つからないか、アクセス権限がありません",
          });
        }

        return c.json(organization);
      } catch (error) {
        console.error("Get organization error:", error);

        if (error instanceof HTTPException) {
          throw error;
        }

        throw new HTTPException(500, {
          message: "組織の詳細取得に失敗しました",
        });
      }
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
    zValidator("json", UpdateOrganizationSchema),
    OrganizationMembershipMiddleware({ role: "admin" }),
    async (c) => {
      const { organizationId } = c.req.valid("param");
      const input = c.req.valid("json");

      try {
        const organization = await updateOrganization(
          c.var.db,
          organizationId,
          c.var.userId,
          input
        );
        if (!organization) {
          throw new HTTPException(404, {
            message: "組織が見つからないか、アクセス権限がありません",
          });
        }
        return c.json(organization);
      } catch (error) {
        console.error("Organization update error:", error);

        if (error instanceof HTTPException) {
          throw error;
        }

        throw new HTTPException(500, {
          message: "組織の更新中にエラーが発生しました",
        });
      }
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
      try {
        const deleted = await deleteOrganization(c.var.db, organizationId);
        if (!deleted) {
          throw new HTTPException(404, {
            message: "組織が見つからないか、アクセス権限がありません",
          });
        }
        return c.json({ success: true });
      } catch (error) {
        console.error("Organization deletion error:", error);
        if (error instanceof HTTPException) {
          throw error;
        }
        throw new HTTPException(500, {
          message: "組織の削除中にエラーが発生しました",
        });
      }
    }
  );

export { organizationRoute };
