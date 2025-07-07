import {
  getUserById,
  setupUserAndOrganization,
  checkUserSetupStatus,
  getUserSidebarData,
  updateOrganizationLatestViewedAt,
  updateUserProfile,
  deleteUserAccount,
  SetupSchema,
  UserProfileUpdateSchema,
} from "@repo/core";
import { z } from "zod";
import { Hono } from "hono";
import { AuthenticatedEnv } from "../env";
import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";

const userRoute = new Hono<AuthenticatedEnv>()

  /**
   * Get current user information (requires authentication)
   */
  .get("/me", async (c) => {
    try {
      const user = await getUserById(c.var.db, c.var.userId);
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
    } catch {
      throw new HTTPException(500, {
        message: "ユーザー情報の取得に失敗しました",
      });
    }
  })

  /**
   * Check setup status (requires authentication)
   */
  .get("/setup", async (c) => {
    try {
      const status = await checkUserSetupStatus(c.var.db, c.var.userId);
      return c.json(status);
    } catch (error) {
      console.error("Setup check error:", error);
      throw new HTTPException(500, {
        message: "初期設定状態の確認に失敗しました",
      });
    }
  })

  /**
   * Setup user and organization (requires authentication)
   */
  .post("/setup", zValidator("json", SetupSchema), async (c) => {
    const input = c.req.valid("json");
    try {
      const setUpResult = await setupUserAndOrganization(
        c.var.db,
        c.var.userId,
        input
      );
      if (!setUpResult) {
        throw new HTTPException(500, {
          message: "初期設定に失敗しました",
        });
      }
      return c.json(setUpResult);
    } catch (error) {
      console.error("Setup error:", error);

      if (error instanceof HTTPException) {
        throw error;
      }

      throw new HTTPException(500, {
        message: "初期設定中にエラーが発生しました",
      });
    }
  })

  /**
   * Get sidebar data (requires authentication)
   */
  .get("/sidebar-data", async (c) => {
    try {
      const sidebarData = await getUserSidebarData(c.var.db, c.var.userId);
      return c.json(sidebarData);
    } catch (error) {
      console.error("Sidebar data error:", error);
      throw new HTTPException(500, {
        message: "サイドバー情報の取得に失敗しました",
      });
    }
  })

  /**
   * Update organization last viewed timestamp (requires authentication)
   */
  .put(
    "/organization-viewed",
    zValidator("json", z.object({ organizationId: z.string() })),
    async (c) => {
      const { organizationId } = c.req.valid("json");
      try {
        await updateOrganizationLatestViewedAt(
          c.var.db,
          c.var.userId,
          organizationId
        );
        return c.json({ success: true });
      } catch (error) {
        console.error("Update organization viewed error:", error);
        throw new HTTPException(500, {
          message: "組織閲覧日時の更新に失敗しました",
        });
      }
    }
  )

  /**
   * Update user profile (requires authentication)
   */
  .put("/profile", zValidator("json", UserProfileUpdateSchema), async (c) => {
    const input = c.req.valid("json");
    try {
      const updatedUser = await updateUserProfile(
        c.var.db,
        c.var.userId,
        input
      );

      if (!updatedUser) {
        throw new HTTPException(404, {
          message: "ユーザーが見つかりません",
        });
      }

      return c.json(updatedUser);
    } catch (error) {
      console.error("Update profile error:", error);

      if (error instanceof HTTPException) {
        throw error;
      }

      throw new HTTPException(500, {
        message: "プロフィールの更新に失敗しました",
      });
    }
  })

  /**
   * Delete user account (requires authentication)
   */
  .delete("/account", async (c) => {
    try {
      // データベースからユーザーデータを削除
      const deleted = await deleteUserAccount(c.var.db, c.var.userId);

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
    } catch (error) {
      console.error("Delete account error:", error);

      if (error instanceof HTTPException) {
        throw error;
      }

      throw new HTTPException(500, {
        message: "アカウントの削除中にエラーが発生しました",
      });
    }
  });

export { userRoute };
