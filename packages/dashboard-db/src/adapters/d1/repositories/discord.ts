import {
  DiscordRepository,
  DiscordChannel,
  DiscordChannelParams,
  UpdateNotificationSettingsInput,
  CreateDiscordChannelInput,
  WebhookData,
  DecryptedWebhookData,
} from "../../../interfaces/discord";
import { discordChannelsTable } from "../schema";
import { and, eq } from "drizzle-orm";
import { Database } from "../client";
import { DashboardDBError } from "../../../errors";
import { encrypt, decrypt } from "../../../encryption";

export class D1DiscordRepo implements DiscordRepository {
  constructor(
    private db: Database,
    private encryptionKey: string
  ) {}

  async listByOrganizationId(
    organizationId: string
  ): Promise<DiscordChannel[]> {
    const channels = await this.db
      .select({
        id: discordChannelsTable.id,
        organizationId: discordChannelsTable.organizationId,
        channelId: discordChannelsTable.channelId,
        name: discordChannelsTable.name,
        guildId: discordChannelsTable.guildId,
        guildName: discordChannelsTable.guildName,
        webhookId: discordChannelsTable.webhookId,
        webhookTokenEnc: discordChannelsTable.webhookTokenEnc,
        mentionRoleId: discordChannelsTable.mentionRoleId,
        notificationSettings: discordChannelsTable.notificationSettings,
        createdAt: discordChannelsTable.createdAt,
        updatedAt: discordChannelsTable.updatedAt,
      })
      .from(discordChannelsTable)
      .where(eq(discordChannelsTable.organizationId, organizationId))
      .orderBy(discordChannelsTable.createdAt)
      .all();

    return channels;
  }

  async findByChannelId(
    params: DiscordChannelParams
  ): Promise<DiscordChannel | null> {
    const { channelId, organizationId } = params;

    const channels = await this.db
      .select({
        id: discordChannelsTable.id,
        organizationId: discordChannelsTable.organizationId,
        channelId: discordChannelsTable.channelId,
        name: discordChannelsTable.name,
        guildId: discordChannelsTable.guildId,
        guildName: discordChannelsTable.guildName,
        webhookId: discordChannelsTable.webhookId,
        webhookTokenEnc: discordChannelsTable.webhookTokenEnc,
        mentionRoleId: discordChannelsTable.mentionRoleId,
        notificationSettings: discordChannelsTable.notificationSettings,
        createdAt: discordChannelsTable.createdAt,
        updatedAt: discordChannelsTable.updatedAt,
      })
      .from(discordChannelsTable)
      .where(
        and(
          eq(discordChannelsTable.id, channelId),
          eq(discordChannelsTable.organizationId, organizationId)
        )
      )
      .limit(1)
      .all();

    return channels[0] || null;
  }

  async updateNotificationSettings(
    params: DiscordChannelParams,
    input: UpdateNotificationSettingsInput
  ): Promise<DiscordChannel> {
    const { channelId, organizationId } = params;

    const result = await this.db
      .update(discordChannelsTable)
      .set({
        notificationSettings: input.notificationSettings,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(discordChannelsTable.id, channelId),
          eq(discordChannelsTable.organizationId, organizationId)
        )
      )
      .returning({
        id: discordChannelsTable.id,
        organizationId: discordChannelsTable.organizationId,
        channelId: discordChannelsTable.channelId,
        name: discordChannelsTable.name,
        guildId: discordChannelsTable.guildId,
        guildName: discordChannelsTable.guildName,
        webhookId: discordChannelsTable.webhookId,
        webhookTokenEnc: discordChannelsTable.webhookTokenEnc,
        mentionRoleId: discordChannelsTable.mentionRoleId,
        notificationSettings: discordChannelsTable.notificationSettings,
        createdAt: discordChannelsTable.createdAt,
        updatedAt: discordChannelsTable.updatedAt,
      })
      .all();

    const updatedChannel = result[0];
    if (!updatedChannel) {
      throw new DashboardDBError(
        "not_found",
        "Discord channel not found or access denied"
      );
    }

    return updatedChannel;
  }

  async unlink(params: DiscordChannelParams): Promise<boolean> {
    const { channelId, organizationId } = params;

    const result = await this.db
      .delete(discordChannelsTable)
      .where(
        and(
          eq(discordChannelsTable.id, channelId),
          eq(discordChannelsTable.organizationId, organizationId)
        )
      )
      .returning({ id: discordChannelsTable.id })
      .all();

    return result.length > 0;
  }

  async createOrUpdate(
    organizationId: string,
    input: CreateDiscordChannelInput
  ): Promise<DiscordChannel> {
    const defaultNotificationSettings = {
      daily: true,
      weekly: true,
      monthly: true,
    };

    // Webhook tokenが提供されている場合は暗号化
    const webhookTokenEnc = input.webhookToken
      ? await this.encryptWebhookToken(input.webhookToken)
      : null;

    const result = await this.db
      .insert(discordChannelsTable)
      .values({
        id: crypto.randomUUID(),
        organizationId: organizationId,
        guildId: input.guildId,
        guildName: input.guildName,
        channelId: input.channelId,
        name: input.channelName,
        webhookId: input.webhookId,
        webhookTokenEnc: webhookTokenEnc,
        notificationSettings:
          input.notificationSettings || defaultNotificationSettings,
      })
      .onConflictDoUpdate({
        target: [
          discordChannelsTable.organizationId,
          discordChannelsTable.channelId,
        ],
        set: {
          guildId: input.guildId,
          guildName: input.guildName,
          name: input.channelName,
          webhookId: input.webhookId,
          webhookTokenEnc: webhookTokenEnc,
          updatedAt: new Date(),
        },
      })
      .returning({
        id: discordChannelsTable.id,
        organizationId: discordChannelsTable.organizationId,
        channelId: discordChannelsTable.channelId,
        name: discordChannelsTable.name,
        guildId: discordChannelsTable.guildId,
        guildName: discordChannelsTable.guildName,
        webhookId: discordChannelsTable.webhookId,
        webhookTokenEnc: discordChannelsTable.webhookTokenEnc,
        mentionRoleId: discordChannelsTable.mentionRoleId,
        notificationSettings: discordChannelsTable.notificationSettings,
        createdAt: discordChannelsTable.createdAt,
        updatedAt: discordChannelsTable.updatedAt,
      })
      .all();

    const channel = result[0];
    if (!channel) {
      throw new DashboardDBError(
        "internal_error",
        "Failed to create or update Discord channel"
      );
    }

    return channel;
  }

  async findWebhookDataByChannelId(
    channelUuid: string
  ): Promise<WebhookData | null> {
    const result = await this.db
      .select({
        webhookId: discordChannelsTable.webhookId,
        webhookTokenEnc: discordChannelsTable.webhookTokenEnc,
      })
      .from(discordChannelsTable)
      .where(eq(discordChannelsTable.id, channelUuid))
      .limit(1)
      .all();

    return result[0] || null;
  }

  async findDecryptedWebhookDataByChannelId(
    channelUuid: string
  ): Promise<DecryptedWebhookData | null> {
    const result = await this.db
      .select({
        webhookId: discordChannelsTable.webhookId,
        webhookTokenEnc: discordChannelsTable.webhookTokenEnc,
      })
      .from(discordChannelsTable)
      .where(eq(discordChannelsTable.id, channelUuid))
      .limit(1)
      .all();

    const webhookData = result[0];
    if (!webhookData?.webhookId || !webhookData.webhookTokenEnc) {
      return null;
    }

    const webhookToken = await this.decryptWebhookToken(
      webhookData.webhookTokenEnc
    );

    return {
      webhookId: webhookData.webhookId,
      webhookToken,
    };
  }

  // Private methods for encryption/decryption
  private encryptWebhookToken(token: string): Promise<string> {
    return encrypt(token, this.encryptionKey);
  }

  private decryptWebhookToken(encryptedToken: string): Promise<string> {
    return decrypt(encryptedToken, this.encryptionKey);
  }
}
