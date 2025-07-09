import { DiscordNotificationSettingsSchema } from "@repo/config";
import { z } from "zod";

/* === DTO === */
export const DiscordChannel = z.object({
  id: z.string(),
  organizationId: z.string(),
  channelId: z.string(),
  name: z.string(),
  guildId: z.string(),
  guildName: z.string(),
  webhookId: z.string().nullable(),
  webhookTokenEnc: z.string().nullable(),
  mentionRoleId: z.string().nullable(),
  notificationSettings: DiscordNotificationSettingsSchema.nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type DiscordChannel = z.infer<typeof DiscordChannel>;

export const RegisterDiscordBotInput = z.object({
  code: z.string().min(1, "Authorization code is required"),
  guildId: z.string().min(1, "Guild ID is required"),
  redirectUri: z.string().url("Redirect URI must be a valid URL"),
});
export type RegisterDiscordBotInput = z.infer<typeof RegisterDiscordBotInput>;

export const GetDiscordOauthUrlInput = z.object({
  redirectUri: z.string().url("Redirect URI must be a valid URL"),
});
export type GetDiscordOauthUrlInput = z.infer<typeof GetDiscordOauthUrlInput>;

export const UpdateNotificationSettingsInput = z.object({
  notificationSettings: DiscordNotificationSettingsSchema,
});
export type UpdateNotificationSettingsInput = z.infer<
  typeof UpdateNotificationSettingsInput
>;

export const UnlinkDiscordChannelInput = z.object({
  channelId: z.string().min(1, "Channel ID is required"),
});
export type UnlinkDiscordChannelInput = z.infer<
  typeof UnlinkDiscordChannelInput
>;

export const DiscordChannelParams = z.object({
  channelId: z.string().min(1, "Channel ID is required"),
  organizationId: z.string().min(1, "Organization ID is required"),
});
export type DiscordChannelParams = z.infer<typeof DiscordChannelParams>;

export const CreateDiscordChannelInput = z.object({
  guildId: z.string(),
  guildName: z.string(),
  channelId: z.string(),
  channelName: z.string(),
  webhookId: z.string().nullable(),
  webhookToken: z.string().nullable(), // プレーンテキストで受け取り、内部で暗号化
  notificationSettings: DiscordNotificationSettingsSchema.optional(),
});
export type CreateDiscordChannelInput = z.infer<
  typeof CreateDiscordChannelInput
>;

export const WebhookData = z.object({
  webhookId: z.string().nullable(),
  webhookTokenEnc: z.string().nullable(),
});
export type WebhookData = z.infer<typeof WebhookData>;

export const DecryptedWebhookData = z.object({
  webhookId: z.string(),
  webhookToken: z.string(), // 復号化されたトークン
});
export type DecryptedWebhookData = z.infer<typeof DecryptedWebhookData>;

/* === Repository interface === */
export interface DiscordRepository {
  listByOrganizationId(organizationId: string): Promise<DiscordChannel[]>;
  findByChannelId(params: DiscordChannelParams): Promise<DiscordChannel | null>;
  updateNotificationSettings(
    params: DiscordChannelParams,
    input: UpdateNotificationSettingsInput
  ): Promise<DiscordChannel>;
  unlink(params: DiscordChannelParams): Promise<boolean>;
  createOrUpdate(
    organizationId: string,
    input: CreateDiscordChannelInput
  ): Promise<DiscordChannel>;
  findWebhookDataByChannelId(channelUuid: string): Promise<WebhookData | null>;
  findDecryptedWebhookDataByChannelId(
    channelUuid: string
  ): Promise<DecryptedWebhookData | null>;
}
