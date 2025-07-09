import { z } from "zod";
import { Hono } from "hono";
import { AuthenticatedEnv } from "../env";
import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import {
  SetupInput,
  UserProfileUpdateInput,
} from "@repo/dashboard-db/interfaces";

const userRoute = new Hono<AuthenticatedEnv>()

  /**
   * Get current user information (requires authentication)
   */
  .get("/me", async (c) => {
    const user = await c.var.dashboardDB.user.findById(c.var.userId);
    const authUser = await c.var.auth.getUser(c.var.userId);

    if (!user || !authUser) {
      throw new HTTPException(404, {
        message: "ユーザーが見つかりません",
      });
    }

    return c.json({
      ...user,
      email: authUser.email,
      isEmailVerified: authUser.isEmailVerified,
    });
  })

  /**
   * Check setup status (requires authentication)
   */
  .get("/setup", async (c) => {
    const status = await c.var.dashboardDB.user.checkSetupStatus(c.var.userId);
    return c.json(status);
  })

  /**
   * Setup user and organization (requires authentication)
   */
  .post("/setup", zValidator("json", SetupInput), async (c) => {
    const input = c.req.valid("json");

    const setUpResult = await c.var.dashboardDB.user.setup(c.var.userId, input);

    return c.json(setUpResult);
  })

  /**
   * Get sidebar data (requires authentication)
   */
  .get("/sidebar-data", async (c) => {
    const sidebarData = await c.var.dashboardDB.user.getSidebarData(
      c.var.userId
    );
    return c.json(sidebarData);
  })

  /**
   * Update organization last viewed timestamp (requires authentication)
   */
  .put(
    "/organization-viewed",
    zValidator("json", z.object({ organizationId: z.string() })),
    async (c) => {
      const { organizationId } = c.req.valid("json");

      await c.var.dashboardDB.user.updateOrganizationLatestViewedAt(
        c.var.userId,
        organizationId
      );

      return c.json({ success: true });
    }
  )

  /**
   * Update user profile (requires authentication)
   */
  .put("/profile", zValidator("json", UserProfileUpdateInput), async (c) => {
    const input = c.req.valid("json");

    const updatedUser = await c.var.dashboardDB.user.updateProfile(
      c.var.userId,
      input
    );

    return c.json(updatedUser);
  })

  /**
   * Delete user account (requires authentication)
   */
  .delete("/account", async (c) => {
    // データベースからユーザーデータを削除
    const deleted = await c.var.dashboardDB.user.delete(c.var.userId);

    if (!deleted) {
      throw new HTTPException(404, {
        message: "ユーザーが見つかりません",
      });
    }

    // Supabaseからユーザーを削除
    try {
      await c.var.auth.deleteUser(c.var.userId);
    } catch (supabaseError) {
      console.error("user deletion failed:", supabaseError);
      // Supabaseの削除が失敗してもデータベースの削除は成功しているため、
      // ログのみ記録してエラーは継続しない
    }

    return c.json({
      success: true,
      message: "アカウントが正常に削除されました",
    });
  });

export { userRoute };
