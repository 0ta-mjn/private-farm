import { Database } from "@repo/db/client";
import { z } from "zod";
import {
  getDiscordOauthRedirectUrl,
  registerDiscordChannel,
} from "@repo/discord";
import {
  discordInstallationsTable,
  discordChannelsTable,
} from "@repo/db/schema";
import { and, eq } from "drizzle-orm";
import {
  DiscordNotificationSettings,
  DiscordNotificationSettingsSchema,
} from "@repo/config";

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
 * @returns Discord連携情報の配列（チャネル情報を含む）
 */
export const getDiscordInstallations = async (
  db: Database,
  organizationId: string
) => {
  // LEFT JOINを使って連携情報とチャネル情報を一度に取得
  const result = await db
    .select({
      // Installation fields
      installationId: discordInstallationsTable.id,
      guildId: discordInstallationsTable.guildId,
      guildName: discordInstallationsTable.guildName,
      installedAt: discordInstallationsTable.installedAt,
      expiresAt: discordInstallationsTable.expiresAt,
      // Channel fields (nullable due to LEFT JOIN)
      channelId: discordChannelsTable.id,
      channelDiscordId: discordChannelsTable.channelId,
      channelName: discordChannelsTable.channelName,
      notificationSettings: discordChannelsTable.notificationSettings,
    })
    .from(discordInstallationsTable)
    .leftJoin(
      discordChannelsTable,
      eq(discordInstallationsTable.id, discordChannelsTable.installationId)
    )
    .where(eq(discordInstallationsTable.organizationId, organizationId))
    .orderBy(discordInstallationsTable.installedAt);

  // 結果をグループ化してinstallation -> channelsの構造に変換
  const installationMap = new Map<
    string,
    {
      id: string;
      guildId: string;
      guildName: string;
      installedAt: Date;
      expiresAt: Date | null;
      channels: {
        id: string;
        channelId: string;
        channelName: string;
        notificationSettings: DiscordNotificationSettings;
      }[];
    }
  >();

  for (const row of result) {
    const installationId = row.installationId;

    if (!installationMap.has(installationId)) {
      installationMap.set(installationId, {
        id: row.installationId,
        guildId: row.guildId,
        guildName: row.guildName,
        installedAt: row.installedAt,
        expiresAt: row.expiresAt,
        channels: [],
      });
    }

    // チャネル情報が存在する場合のみ追加
    if (row.channelDiscordId && row.channelId) {
      installationMap.get(installationId)?.channels.push({
        id: row.channelId,
        channelId: row.channelDiscordId,
        channelName: row.channelName || "",
        notificationSettings: row.notificationSettings || {},
      });
    }
  }

  return Array.from(installationMap.values()).sort((a, b) => {
    // インストール日時でソート
    return (
      new Date(b.installedAt).getTime() - new Date(a.installedAt).getTime()
    );
  });
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

export const UpdateNotificationSettingsInputSchema = z.object({
  channelId: z.string().min(1, "チャネルIDは必須です"),
  notificationSettings: DiscordNotificationSettingsSchema,
});
export type UpdateNotificationSettingsInput = z.infer<
  typeof UpdateNotificationSettingsInputSchema
>;

/**
 * Discord チャネルの通知設定を更新する関数
 *
 * @param db - データベースインスタンス
 * @param organizationId - 組織ID
 * @param input - 更新する通知設定情報
 * @returns 更新結果
 */
export const updateDiscordChannelNotificationSettings = async (
  db: Database,
  organizationId: string,
  input: UpdateNotificationSettingsInput
) => {
  // まず、指定されたチャネルが組織に属していることを確認
  const channel = await db
    .select({
      id: discordChannelsTable.id,
      installationId: discordChannelsTable.installationId,
    })
    .from(discordChannelsTable)
    .innerJoin(
      discordInstallationsTable,
      eq(discordChannelsTable.installationId, discordInstallationsTable.id)
    )
    .where(
      and(
        eq(discordChannelsTable.id, input.channelId),
        eq(discordInstallationsTable.organizationId, organizationId)
      )
    )
    .limit(1);

  if (channel.length === 0) {
    throw new Error("指定されたチャネルが見つからないか、権限がありません");
  }

  // 通知設定を更新
  const result = await db
    .update(discordChannelsTable)
    .set({
      notificationSettings: input.notificationSettings,
      updatedAt: new Date(),
    })
    .where(eq(discordChannelsTable.id, input.channelId))
    .returning({
      id: discordChannelsTable.id,
      notificationSettings: discordChannelsTable.notificationSettings,
    });

  return result[0];
};

export const UnlinkDiscordChannelInputSchema = z.object({
  channelId: z.string().min(1, "チャネルIDは必須です"),
});
export type UnlinkDiscordChannelInput = z.infer<
  typeof UnlinkDiscordChannelInputSchema
>;

/**
 * Discord チャネルのリンクを解除する関数
 *
 * @param db - データベースインスタンス
 * @param organizationId - 組織ID
 * @param input - 削除するチャネル情報
 * @returns リンク解除が成功したかどうか
 */
export const unlinkDiscordChannel = async (
  db: Database,
  organizationId: string,
  channelId: string
) => {
  // まず、指定されたチャネルが組織に属していることを確認
  const channel = await db
    .select({
      id: discordChannelsTable.id,
      installationId: discordChannelsTable.installationId,
    })
    .from(discordChannelsTable)
    .innerJoin(
      discordInstallationsTable,
      eq(discordChannelsTable.installationId, discordInstallationsTable.id)
    )
    .where(
      and(
        eq(discordChannelsTable.id, channelId),
        eq(discordInstallationsTable.organizationId, organizationId)
      )
    )
    .limit(1);

  if (channel.length === 0) {
    throw new Error("指定されたチャネルが見つからないか、権限がありません");
  }

  // チャネルを削除
  const result = await db
    .delete(discordChannelsTable)
    .where(eq(discordChannelsTable.id, channelId))
    .returning({ id: discordChannelsTable.id });

  return result.length > 0;
};
