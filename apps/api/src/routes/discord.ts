import { OrganizationMembershipMiddleware } from "../middleware/organization";
import { z } from "zod";
import { DISCORD_BOT_WELCOME_MESSAGE } from "@repo/config";
import { Hono } from "hono";
import { AuthenticatedEnv } from "../env";
import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import {
  DiscordOauthRedirectUrlParams,
  DiscordRegistrationInput,
  getDiscordOauthRedirectUrl,
  registerDiscordChannel,
  sendViaWebhook,
} from "@repo/discord";
import {
  DiscordChannelParams,
  UpdateNotificationSettingsInput,
} from "@repo/dashboard-db/interfaces";

const discordRoute = new Hono<AuthenticatedEnv>()

  /**
   * Get Discord channels (requires authentication and organization membership)
   */
  .get(
    "/channels/:organizationId",
    zValidator(
      "param",
      z.object({ organizationId: z.string().min(1, "組織IDは必須です") })
    ),
    OrganizationMembershipMiddleware(),
    async (c) => {
      const { organizationId } = c.req.valid("param");

      const channels =
        await c.var.dashboardDB.discord.listByOrganizationId(organizationId);
      return c.json(channels);
    }
  )

  /**
   * Get Discord OAuth URL (requires authentication and admin role)
   */
  .post(
    "/oauth-url/:organizationId",
    zValidator(
      "param",
      z.object({ organizationId: z.string().min(1, "組織IDは必須です") })
    ),
    zValidator("json", DiscordOauthRedirectUrlParams),
    OrganizationMembershipMiddleware({ role: "admin" }),
    async (c) => {
      const { organizationId } = c.req.valid("param");
      const input = c.req.valid("json");

      const oauthUrl = getDiscordOauthRedirectUrl(
        c.var.discordKeys,
        organizationId,
        input
      );
      return c.json({ url: oauthUrl });
    }
  )

  /**
   * Link Discord channel (requires authentication and admin role)
   */
  .post(
    "/link/:organizationId",
    zValidator(
      "param",
      z.object({ organizationId: z.string().min(1, "組織IDは必須です") })
    ),
    zValidator(
      "json",
      DiscordRegistrationInput.extend({
        state: z.string().min(1, "stateパラメータは必須です"),
      })
    ),
    OrganizationMembershipMiddleware({ role: "admin" }),
    async (c) => {
      const { organizationId } = c.req.valid("param");
      const input = c.req.valid("json");

      // stateパラメータの検証（CSRF対策）
      // state形式: "organizationId:nonce"
      const [stateOrgId, nonce] = input.state.split(":");
      if (!stateOrgId || !nonce || stateOrgId !== organizationId) {
        throw new HTTPException(400, {
          message: "無効なstateパラメータです。CSRF攻撃の可能性があります。",
        });
      }

      // Discordボットを登録
      const registorationData = await registerDiscordChannel(
        c.var.discordKeys,
        {
          code: input.code,
          guildId: input.guildId,
          redirectUri: input.redirectUri,
        }
      );

      if (!registorationData.channelId) {
        throw new HTTPException(400, {
          message:
            "Discordチャンネルの登録に失敗しました。チャンネルIDが取得できません。",
        });
      }

      const result = await c.var.dashboardDB.discord.createOrUpdate(
        organizationId,
        {
          guildId: registorationData.guildId,
          guildName: registorationData.guildName,
          channelId: registorationData.channelId,
          channelName: registorationData.channelName,
          webhookId: registorationData.webhookId,
          webhookToken: registorationData.webhookToken,
          notificationSettings: { daily: true, weekly: true, monthly: true },
        }
      );

      // 登録成功後に初期メッセージを送信
      if (registorationData.webhookId && registorationData.webhookToken) {
        try {
          await sendViaWebhook(
            {
              webhookId: registorationData.webhookId,
              webhookToken: registorationData.webhookToken,
            },
            { content: DISCORD_BOT_WELCOME_MESSAGE }
          );
        } catch (webhookError) {
          // Webhookエラーは記録するがボット登録は成功として扱う
          console.error("Initial webhook message failed:", webhookError);
        }
      }

      return c.json(result);
    }
  )

  /**
   * Update notification settings (requires authentication and admin role)
   */
  .put(
    "/channels/:organizationId/:channelId/notification-settings",
    zValidator("param", DiscordChannelParams),
    zValidator("json", UpdateNotificationSettingsInput),
    OrganizationMembershipMiddleware({ role: "admin" }),
    async (c) => {
      const param = c.req.valid("param");
      const input = c.req.valid("json");

      const result = await c.var.dashboardDB.discord.updateNotificationSettings(
        param,
        input
      );

      return c.json(result);
    }
  )

  /**
   * Unlink Discord channel (requires authentication and admin role)
   */
  .delete(
    "/channels/:organizationId/:channelId",
    zValidator("param", DiscordChannelParams),
    OrganizationMembershipMiddleware({ role: "admin" }),
    async (c) => {
      const param = c.req.valid("param");

      const result = await c.var.dashboardDB.discord.unlink(param);

      if (!result) {
        throw new HTTPException(404, {
          message: "指定されたDiscordチャネルが見つかりません",
        });
      }

      return c.json({ success: true });
    }
  );

export { discordRoute };
