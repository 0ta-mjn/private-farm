import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../trpc";
import { guardOrganizationMembership } from "../guard/organization";
import {
  getDiscordOauthUrl,
  GetDiscordOauthUrlInputSchema,
  installDiscordGuild,
  InstallDiscordGuildInputSchema,
  unlinkDiscordGuild,
  getDiscordInstallations,
} from "@repo/core";
import { z } from "zod";

export const discordRouter = {
  // Discord連携情報の取得
  getInstallations: protectedProcedure
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
        const installations = await getDiscordInstallations(
          ctx.db,
          input.organizationId
        );
        return installations;
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
  link: protectedProcedure
    .input(
      InstallDiscordGuildInputSchema.extend({
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
        // Discordのギルドを登録
        const result = await installDiscordGuild(ctx.db, input.organizationId, {
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

  // アンリンク
  unlink: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().min(1, "組織IDは必須です"),
        installationId: z.string().min(1, "インストールIDは必須です"),
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
        // Discordのギルドをアンリンク
        const deleted = await unlinkDiscordGuild(
          ctx.db,
          input.organizationId,
          input.installationId
        );

        if (!deleted) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "指定されたDiscordのインストールが見つかりません",
          });
        }

        return { success: true };
      } catch (error) {
        console.error("Thing detail error:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Discordのアンリンク中にエラーが発生しました",
        });
      }
    }),
} satisfies TRPCRouterRecord;
