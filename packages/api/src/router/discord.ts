import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../trpc";
import { guardOrganizationMembership } from "../guard/organization";
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
} from "@repo/core";
import { z } from "zod";

export const discordRouter = {
  // Discordチャネル情報の取得
  getChannels: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().min(1, "組織IDは必須です"),
      })
    )
    .query(async ({ ctx, input }) => {
      // 組織メンバーシップをチェック
      await guardOrganizationMembership(
        ctx.db,
        ctx.session.user.id,
        input.organizationId
      );

      try {
        const channels = await getDiscordChannels(ctx.db, input.organizationId);
        return channels;
      } catch (error) {
        console.error("Discord installations fetch error:", error);

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Discord連携情報の取得中にエラーが発生しました",
        });
      }
    }),

  // OAuth URLの生成
  getOAuthUrl: protectedProcedure
    .input(
      GetDiscordOauthUrlInputSchema.extend({
        organizationId: z.string().min(1, "組織IDは必須です"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 組織メンバーシップをチェック
      await guardOrganizationMembership(
        ctx.db,
        ctx.session.user.id,
        input.organizationId,
        "admin"
      );

      return getDiscordOauthUrl(input.organizationId, input);
    }),

  // リンク
  linkChannel: protectedProcedure
    .input(
      RegisterDiscordBotInputSchema.extend({
        organizationId: z.string().min(1, "組織IDは必須です"),
        state: z.string().min(1, "stateパラメータは必須です"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // stateパラメータの検証（CSRF対策）
      // state形式: "organizationId:nonce"
      const [stateOrgId, nonce] = input.state.split(":");
      if (!stateOrgId || !nonce || stateOrgId !== input.organizationId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "無効なstateパラメータです。CSRF攻撃の可能性があります。",
        });
      }

      // 組織メンバーシップをチェック
      await guardOrganizationMembership(
        ctx.db,
        ctx.session.user.id,
        input.organizationId,
        "admin"
      );

      try {
        // Discordボットを登録
        const result = await registerDiscordBot(ctx.db, input.organizationId, {
          code: input.code,
          guildId: input.guildId,
          redirectUri: input.redirectUri,
        });

        return result;
      } catch (error) {
        console.error("Discord link error:", error);

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Discordのリンク中にエラーが発生しました",
        });
      }
    }),

  // 通知設定の更新
  updateNotificationSettings: protectedProcedure
    .input(
      UpdateNotificationSettingsInputSchema.extend({
        organizationId: z.string().min(1, "組織IDは必須です"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 組織メンバーシップをチェック
      await guardOrganizationMembership(
        ctx.db,
        ctx.session.user.id,
        input.organizationId,
        "admin"
      );

      try {
        const result = await updateDiscordChannelNotificationSettings(
          ctx.db,
          input.organizationId,
          {
            channelId: input.channelId,
            notificationSettings: input.notificationSettings,
          }
        );

        return result;
      } catch (error) {
        console.error("Discord notification settings update error:", error);

        if (error instanceof Error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Discord通知設定の更新中にエラーが発生しました",
        });
      }
    }),

  // チャネルのリンク解除
  unlinkChannel: protectedProcedure
    .input(
      UnlinkDiscordChannelInputSchema.extend({
        organizationId: z.string().min(1, "組織IDは必須です"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 組織メンバーシップをチェック
      await guardOrganizationMembership(
        ctx.db,
        ctx.session.user.id,
        input.organizationId,
        "admin"
      );

      try {
        const result = await unlinkDiscordChannel(
          ctx.db,
          input.organizationId,
          input.channelId
        );

        if (!result) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "指定されたDiscordチャネルが見つかりません",
          });
        }

        return { success: true };
      } catch (error) {
        console.error("Discord channel unlink error:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        if (error instanceof Error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Discordチャネルのリンク解除中にエラーが発生しました",
        });
      }
    }),
} satisfies TRPCRouterRecord;
