import { OrganizationMembershipMiddleware } from "../middleware/organization";
import {
  getDiscordOauthUrl,
  GetDiscordOauthUrlInputSchema,
  registerDiscordBot,
  RegisterDiscordBotInputSchema,
  getDiscordChannels,
  updateDiscordChannelNotificationSettings,
  UpdateNotificationSettingsInputSchema,
  unlinkDiscordChannel,
  UnlinkDiscordChannelInputSchema,
  sendMessageViaWebhook,
} from "@repo/core";
import {
  DiscordError,
  DiscordAuthError,
  DiscordBotError,
  DiscordAPIError,
  DiscordConfigError,
  DiscordWebhookError,
  DiscordRateLimitError,
  DiscordChannelNotFoundError,
} from "@repo/discord/errors";
import { z } from "zod";
import { DISCORD_BOT_WELCOME_MESSAGE } from "@repo/config";
import { Hono } from "hono";
import { AuthenticatedEnv } from "../env";
import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";

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

      try {
        const channels = await getDiscordChannels(c.var.db, organizationId);
        return c.json(channels);
      } catch (error) {
        console.error("Discord installations fetch error:", error);

        throw new HTTPException(500, {
          message: "Discord連携情報の取得中にエラーが発生しました",
        });
      }
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
    zValidator("json", GetDiscordOauthUrlInputSchema),
    OrganizationMembershipMiddleware({ role: "admin" }),
    async (c) => {
      const { organizationId } = c.req.valid("param");
      const input = c.req.valid("json");

      const oauthUrl = getDiscordOauthUrl(
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
      RegisterDiscordBotInputSchema.extend({
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

      try {
        // Discordボットを登録
        const result = await registerDiscordBot(
          c.var.db,
          c.var.discordKeys,
          organizationId,
          {
            code: input.code,
            guildId: input.guildId,
            redirectUri: input.redirectUri,
          }
        );

        // 登録成功後に初期メッセージを送信
        try {
          await sendMessageViaWebhook(
            c.var.db,
            c.var.discordKeys.encryptionKey,
            result.channelUuid,
            {
              content: DISCORD_BOT_WELCOME_MESSAGE,
            }
          );
        } catch (webhookError) {
          // Webhookエラーは記録するがボット登録は成功として扱う
          console.error("Initial webhook message failed:", webhookError);
        }

        return c.json(result);
      } catch (error) {
        console.error("Discord error:", error);

        if (error instanceof DiscordConfigError) {
          throw new HTTPException(500, {
            message: "Discord設定エラー: サーバー側の設定を確認してください",
          });
        }

        if (error instanceof DiscordAuthError) {
          throw new HTTPException(401, {
            message: "Discord認証エラー: 認証情報が無効または期限切れです",
          });
        }

        if (error instanceof DiscordBotError) {
          throw new HTTPException(400, {
            message: "Discordボットエラー: ボットがサーバーに参加していません",
          });
        }

        if (error instanceof DiscordChannelNotFoundError) {
          throw new HTTPException(404, {
            message: "指定されたDiscordチャンネルが見つかりません",
          });
        }

        if (error instanceof DiscordRateLimitError) {
          throw new HTTPException(429, {
            message: `Discordレート制限に達しました。${error.retryAfter ? `${error.retryAfter}秒後` : "しばらく"}にお試しください`,
          });
        }

        if (error instanceof DiscordWebhookError) {
          if (error.statusCode === 404) {
            throw new HTTPException(404, {
              message:
                "Discordウェブフックが見つかりません。再度連携を行ってください",
            });
          }
          throw new HTTPException(400, {
            message: `Discordウェブフックエラー: ${error.message}`,
          });
        }

        if (error instanceof DiscordAPIError) {
          if (error.statusCode === 403) {
            throw new HTTPException(403, {
              message:
                "Discord APIへのアクセスが拒否されました。権限を確認してください",
            });
          }
          if (error.statusCode === 404) {
            throw new HTTPException(404, {
              message: "Discordリソースが見つかりません",
            });
          }
          throw new HTTPException(400, {
            message: `Discord APIエラー: ${error.message}`,
          });
        }

        if (error instanceof DiscordError) {
          throw new HTTPException(400, {
            message: `Discordエラー: ${error.message}`,
          });
        }

        // その他のエラー
        if (error instanceof Error) {
          throw new HTTPException(500, {
            message: error.message,
          });
        }

        throw new HTTPException(500, {
          message: "Discord連携中に予期しないエラーが発生しました",
        });
      }
    }
  )

  /**
   * Update notification settings (requires authentication and admin role)
   */
  .put(
    "/notification-settings/:organizationId",
    zValidator(
      "param",
      z.object({ organizationId: z.string().min(1, "組織IDは必須です") })
    ),
    zValidator("json", UpdateNotificationSettingsInputSchema),
    OrganizationMembershipMiddleware({ role: "admin" }),
    async (c) => {
      const { organizationId } = c.req.valid("param");
      const input = c.req.valid("json");

      try {
        const result = await updateDiscordChannelNotificationSettings(
          c.var.db,
          organizationId,
          {
            channelId: input.channelId,
            notificationSettings: input.notificationSettings,
          }
        );

        if (!result) {
          throw new HTTPException(404, {
            message: "指定されたDiscordチャネルが見つかりません",
          });
        }

        return c.json(result);
      } catch (error) {
        console.error("Discord notification settings update error:", error);

        if (error instanceof HTTPException) {
          throw error;
        }

        if (error instanceof Error) {
          throw new HTTPException(400, {
            message: error.message,
          });
        }

        throw new HTTPException(500, {
          message: "Discord通知設定の更新中にエラーが発生しました",
        });
      }
    }
  )

  /**
   * Unlink Discord channel (requires authentication and admin role)
   */
  .delete(
    "/unlink/:organizationId",
    zValidator(
      "param",
      z.object({ organizationId: z.string().min(1, "組織IDは必須です") })
    ),
    zValidator("json", UnlinkDiscordChannelInputSchema),
    OrganizationMembershipMiddleware({ role: "admin" }),
    async (c) => {
      const { organizationId } = c.req.valid("param");
      const input = c.req.valid("json");

      try {
        const result = await unlinkDiscordChannel(
          c.var.db,
          organizationId,
          input.channelId
        );

        if (!result) {
          throw new HTTPException(404, {
            message: "指定されたDiscordチャネルが見つかりません",
          });
        }

        return c.json({ success: true });
      } catch (error) {
        console.error("Discord channel unlink error:", error);

        if (error instanceof HTTPException) {
          throw error;
        }

        if (error instanceof Error) {
          throw new HTTPException(400, {
            message: error.message,
          });
        }

        throw new HTTPException(500, {
          message: "Discordチャネルのリンク解除中にエラーが発生しました",
        });
      }
    }
  );

export { discordRoute };
