import { Database } from "@repo/db/client";
import { z } from "zod";
import {
  getDiscordOauthRedirectUrl,
  registerDiscordChannel,
} from "@repo/discord";
import { discordInstallationsTable } from "@repo/db/schema";
import { and, eq } from "drizzle-orm";

export const InstallDiscordGuildInputSchema = z.object({
  code: z.string().min(1, "認証コードは必須です"),
  guildId: z.string().min(1, "ギルドIDは必須です"),
  redirectUri: z.string().url("リダイレクトURIは有効なURLである必要があります"),
});
export type InstallDiscordGuildInput = z.infer<
  typeof InstallDiscordGuildInputSchema
>;

export const GetDiscordOauthUrlInputSchema = z.object({
  redirectUri: z.string().url("リダイレクトURIは有効なURLである必要があります"),
});
export type GetDiscordOauthUrlInput = z.infer<
  typeof GetDiscordOauthUrlInputSchema
>;

/**
 * Discord OAuth URLを取得する関数
 *
 * @param organizationId - 組織ID
 * @param input - リダイレクトURIを含むオブジェクト
 * @returns Discord OAuthのリダイレクトURL
 */

export const getDiscordOauthUrl = (
  organizationId: string,
  input: GetDiscordOauthUrlInput
) => {
  return getDiscordOauthRedirectUrl(organizationId, input.redirectUri);
};

/**
 * 組織のDiscord連携情報を取得する関数
 *
 * @param db - データベースインスタンス
 * @param organizationId - 組織ID
 * @returns Discord連携情報の配列
 */
export const getDiscordInstallations = async (
  db: Database,
  organizationId: string
) => {
  const installations = await db
    .select({
      id: discordInstallationsTable.id,
      guildId: discordInstallationsTable.guildId,
      guildName: discordInstallationsTable.guildName,
      installedAt: discordInstallationsTable.installedAt,
      expiresAt: discordInstallationsTable.expiresAt,
    })
    .from(discordInstallationsTable)
    .where(eq(discordInstallationsTable.organizationId, organizationId))
    .orderBy(discordInstallationsTable.installedAt);

  return installations;
};

/**
 * Discordサーバーをインストールするための関数
 *
 * @param db - データベースインスタンス
 * @param organizationId - 組織ID
 * @param input - インストールに必要な情報を含むオブジェクト
 * @returns 登録結果
 */
export const installDiscordGuild = async (
  db: Database,
  organizationId: string,
  input: InstallDiscordGuildInput
) => {
  // ギルドの登録処理を実行
  const result = await registerDiscordChannel(db, {
    organizationId,
    code: input.code,
    guildId: input.guildId,
    redirectUri: input.redirectUri,
  });

  return result;
};

/**
 * Discordサーバーのリンクを解除する関数
 *
 * @param db - データベースインスタンス
 * @param organizationId - 組織ID
 * @param installationId - インストールID
 * @returns リンク解除が成功したかどうか
 */
export const unlinkDiscordGuild = async (
  db: Database,
  organizationId: string,
  installationId: string
) => {
  const result = await db
    .delete(discordInstallationsTable)
    .where(
      and(
        eq(discordInstallationsTable.organizationId, organizationId),
        eq(discordInstallationsTable.id, installationId)
      )
    )
    .returning();

  return result.length > 0;
};
