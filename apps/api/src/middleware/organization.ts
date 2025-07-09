import { DashboardDBError, MemberRole } from "@repo/dashboard-db";
import { HTTPException } from "hono/http-exception";
import { createMiddleware } from "hono/factory";
import { AuthenticatedEnv } from "../env";

export const OrganizationMembershipMiddleware = (options?: {
  role?: MemberRole;
}) =>
  createMiddleware<AuthenticatedEnv>(async (c, next) => {
    const organizationId = c.req.param("organizationId");

    if (!organizationId) {
      throw new HTTPException(400, {
        message: "ユーザーIDと組織IDは必須です",
      });
    }

    try {
      await c.var.dashboardDB.organization.checkMembership(
        { userId: c.var.userId, organizationId },
        options?.role
      );
    } catch (error) {
      if (error instanceof DashboardDBError) {
        switch (error.code) {
          case "forbidden":
            throw new HTTPException(403, {
              message: error.message,
            });
          case "not_found":
            throw new HTTPException(404, {
              message: error.message,
            });
        }
      }

      console.error("Organization membership check error:", error);

      throw new HTTPException(500, {
        message: "組織メンバーシップの確認中にエラーが発生しました",
      });
    }

    return next();
  });
