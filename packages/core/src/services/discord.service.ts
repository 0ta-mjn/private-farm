import { Database } from "@repo/dashboard-db/client";
import { z } from "zod";
import {
  DiscordRegistrationKeys,
  getDiscordOauthRedirectUrl,
  registerDiscordChannel,
  sendViaWebhook,
  WebhookPayload,
} from "@repo/discord";
import { discordChannelsTable } from "@repo/dashboard-db/schema";
import { and, eq } from "drizzle-orm";
import { DiscordNotificationSettingsSchema } from "@repo/config";

export const RegisterDiscordBotInputSchema = z.object({
  code: z.string().min(1, "認証コードは必須です"),
  guildId: z.string().min(1, "ギルドIDは必須です"),
  redirectUri: z.string().url("リダイレクトURIは有効なURLである必要があります"),
});
export type RegisterDiscordBotInput = z.infer<
  typeof RegisterDiscordBotInputSchema
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
  keys: DiscordRegistrationKeys,
  organizationId: string,
  input: GetDiscordOauthUrlInput
) => {
  return getDiscordOauthRedirectUrl(keys, organizationId, input.redirectUri);
};

/**
 * 組織のDiscordチャネル情報を取得する関数
 *
 * @param db - データベースインスタンス
 * @param organizationId - 組織ID
 * @returns Discordチャネル情報の配列
 */
export const getDiscordChannels = async (
  db: Database,
  organizationId: string
) => {
  // 組織に紐づくDiscordチャンネル情報を取得
  const channels = await db
    .select({
      id: discordChannelsTable.id,
      guildId: discordChannelsTable.guildId,
      guildName: discordChannelsTable.guildName,
      channelId: discordChannelsTable.channelId,
      name: discordChannelsTable.name,
      notificationSettings: discordChannelsTable.notificationSettings,
      createdAt: discordChannelsTable.createdAt,
    })
    .from(discordChannelsTable)
    .where(eq(discordChannelsTable.organizationId, organizationId))
    .orderBy(discordChannelsTable.createdAt);

  return channels;
};

/**
 * Discordボットを登録するための関数
 *
 * @param db - データベースインスタンス
 * @param organizationId - 組織ID
 * @param input - インストールに必要な情報を含むオブジェクト
 * @returns 登録結果
 */
export const registerDiscordBot = async (
  db: Database,
  keys: DiscordRegistrationKeys,
  organizationId: string,
  input: RegisterDiscordBotInput
) => {
  // ギルドの登録処理を実行
  const result = await registerDiscordChannel(db, keys, {
    organizationId,
    code: input.code,
    guildId: input.guildId,
    redirectUri: input.redirectUri,
  });

  return result;
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
  // 通知設定を更新
  const result = await db
    .update(discordChannelsTable)
    .set({
      notificationSettings: input.notificationSettings,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(discordChannelsTable.id, input.channelId),
        eq(discordChannelsTable.organizationId, organizationId)
      )
    )
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
 * @param channelId - チャネルID
 * @returns リンク解除が成功したかどうか
 */
export const unlinkDiscordChannel = async (
  db: Database,
  organizationId: string,
  channelId: string
) => {
  // チャネルを削除
  const result = await db
    .delete(discordChannelsTable)
    .where(
      and(
        eq(discordChannelsTable.id, channelId),
        eq(discordChannelsTable.organizationId, organizationId)
      )
    )
    .returning({ id: discordChannelsTable.id });

  return result.length > 0;
};

/**
 * Discord Webhookを介してメッセージを送信する関数
 *
 * @param db - データベースインスタンス
 * @param channelId - チャネルID
 * @param payload - 送信するWebhookペイロード
 * @returns 送信結果
 */
export const sendMessageViaWebhook = async (
  db: Database,
  encryptionKey: string,
  channelId: string,
  payload: WebhookPayload
) => {
  // Webhookを介してメッセージを送信
  const result = await sendViaWebhook(db, encryptionKey, channelId, payload);

  return result;
};
