import { describe, it, expect, beforeEach } from "vitest";
import {
  discordChannelsTable,
  organizationsTable,
  usersTable,
} from "../schema";
import { createTestDashboardD1Client } from "../testing";
import { D1DiscordRepo } from "./discord";
import {
  CreateDiscordChannelInput,
  UpdateNotificationSettingsInput,
  DiscordChannelParams,
} from "../../../interfaces";
import { DashboardDBError } from "../../../errors";
import { eq } from "drizzle-orm";
import { createRandomHex } from "../../../encryption";

const db = await createTestDashboardD1Client();
const testEncryptionKey = createRandomHex(32); // 32バイトのランダムキー
const repo = new D1DiscordRepo(db, testEncryptionKey);

describe("D1DiscordRepo", () => {
  let testOrganizationId: string;

  beforeEach(async () => {
    // テスト用のデータベースをリセット
    await db.delete(discordChannelsTable);
    await db.delete(organizationsTable);
    await db.delete(usersTable);

    // テストデータをセットアップ
    testOrganizationId = "test-org-id";

    await db.insert(organizationsTable).values({
      id: testOrganizationId,
      name: "Test Organization",
      description: "Test description",
    });
  });

  describe("listByOrganizationId", () => {
    it("組織のDiscordチャネル情報を取得できる", async () => {
      // Arrange
      const now = new Date();

      await db.insert(discordChannelsTable).values([
        {
          id: "channel-1-1",
          organizationId: testOrganizationId,
          guildId: "test-guild-id-1",
          guildName: "Test Guild 1",
          channelId: "discord-channel-1-1",
          name: "general",
          webhookId: "webhook-1-1",
          webhookTokenEnc: "encrypted-token-1-1",
          notificationSettings: {
            daily: true,
            weekly: false,
            monthly: true,
          },
          createdAt: now,
        },
        {
          id: "channel-1-2",
          organizationId: testOrganizationId,
          guildId: "test-guild-id-1",
          guildName: "Test Guild 1",
          channelId: "discord-channel-1-2",
          name: "alerts",
          webhookId: "webhook-1-2",
          webhookTokenEnc: "encrypted-token-1-2",
          notificationSettings: {
            daily: true,
            weekly: true,
            monthly: true,
          },
          createdAt: now,
        },
        {
          id: "channel-2-1",
          organizationId: testOrganizationId,
          guildId: "test-guild-id-2",
          guildName: "Test Guild 2",
          channelId: "discord-channel-2-1",
          name: "farm-updates",
          webhookId: "webhook-2-1",
          webhookTokenEnc: "encrypted-token-2-1",
          notificationSettings: {
            daily: false,
            weekly: true,
            monthly: false,
          },
          createdAt: new Date(now.getTime() + 1000), // 1秒後
        },
      ]);

      // Act
      const channels = await repo.listByOrganizationId(testOrganizationId);

      // Assert
      expect(channels).toHaveLength(3);

      // チャネル情報の検証
      const generalChannel = channels.find((c) => c.name === "general");
      expect(generalChannel).toBeDefined();
      expect(generalChannel?.guildId).toBe("test-guild-id-1");
      expect(generalChannel?.guildName).toBe("Test Guild 1");
      expect(generalChannel?.notificationSettings).toEqual({
        daily: true,
        weekly: false,
        monthly: true,
      });

      const alertsChannel = channels.find((c) => c.name === "alerts");
      expect(alertsChannel).toBeDefined();
      expect(alertsChannel?.guildId).toBe("test-guild-id-1");

      const farmUpdatesChannel = channels.find(
        (c) => c.name === "farm-updates"
      );
      expect(farmUpdatesChannel).toBeDefined();
      expect(farmUpdatesChannel?.guildId).toBe("test-guild-id-2");
      expect(farmUpdatesChannel?.guildName).toBe("Test Guild 2");
    });

    it("連携がない組織の場合は空配列を返す", async () => {
      // Act
      const channels = await repo.listByOrganizationId(testOrganizationId);

      // Assert
      expect(channels).toHaveLength(0);
      expect(channels).toEqual([]);
    });

    it("指定した組織の連携のみを取得する", async () => {
      // Arrange
      const organizationId2 = "test-org-id-2";

      await db.insert(organizationsTable).values({
        id: organizationId2,
        name: "Test Organization 2",
        description: "Test Description 2",
      });

      // 各組織にDiscordチャネルを作成
      await db.insert(discordChannelsTable).values([
        {
          id: "channel-org1",
          organizationId: testOrganizationId,
          guildId: "guild-org1",
          guildName: "Guild Org 1",
          channelId: "discord-channel-org1",
          name: "general",
          webhookId: "webhook-org1",
          webhookTokenEnc: "encrypted-token-org1",
          notificationSettings: {
            daily: true,
            weekly: false,
            monthly: true,
          },
        },
        {
          id: "channel-org2",
          organizationId: organizationId2,
          guildId: "guild-org2",
          guildName: "Guild Org 2",
          channelId: "discord-channel-org2",
          name: "general",
          webhookId: "webhook-org2",
          webhookTokenEnc: "encrypted-token-org2",
          notificationSettings: {
            daily: false,
            weekly: true,
            monthly: false,
          },
        },
      ]);

      // Act
      const channels = await repo.listByOrganizationId(testOrganizationId);

      // Assert
      expect(channels).toHaveLength(1);
      expect(channels[0]?.guildId).toBe("guild-org1");
      expect(channels[0]?.guildName).toBe("Guild Org 1");
      expect(channels[0]?.name).toBe("general");
    });

    it("作成日時順で並べられる", async () => {
      // Arrange
      const now = new Date();

      await db.insert(discordChannelsTable).values([
        {
          id: "channel-1",
          organizationId: testOrganizationId,
          guildId: "guild-1",
          guildName: "Guild 1",
          channelId: "discord-channel-1",
          name: "channel-1",
          webhookId: "webhook-1",
          webhookTokenEnc: "token-1",
          notificationSettings: { daily: true, weekly: false, monthly: true },
          createdAt: new Date(now.getTime() + 2000),
        },
        {
          id: "channel-2",
          organizationId: testOrganizationId,
          guildId: "guild-2",
          guildName: "Guild 2",
          channelId: "discord-channel-2",
          name: "channel-2",
          webhookId: "webhook-2",
          webhookTokenEnc: "token-2",
          notificationSettings: { daily: false, weekly: true, monthly: false },
          createdAt: new Date(now.getTime() + 1000),
        },
      ]);

      // Act
      const channels = await repo.listByOrganizationId(testOrganizationId);

      // Assert
      expect(channels).toHaveLength(2);
      // 作成日時順（古い順）で並んでいることを確認
      expect(channels[0]?.name).toBe("channel-2");
      expect(channels[1]?.name).toBe("channel-1");
    });
  });

  describe("findByChannelId", () => {
    it("チャネルを取得できる", async () => {
      // Arrange
      const channelId = "test-channel-id";
      const params: DiscordChannelParams = {
        channelId,
        organizationId: testOrganizationId,
      };

      await db.insert(discordChannelsTable).values({
        id: channelId,
        organizationId: testOrganizationId,
        guildId: "test-guild-id",
        guildName: "Test Guild",
        channelId: "discord-channel-id",
        name: "test-channel",
        webhookId: "test-webhook-id",
        webhookTokenEnc: "encrypted-webhook-token",
        notificationSettings: {
          daily: true,
          weekly: false,
          monthly: true,
        },
      });

      // Act
      const result = await repo.findByChannelId(params);

      // Assert
      expect(result).toBeDefined();
      expect(result?.id).toBe(channelId);
      expect(result?.name).toBe("test-channel");
      expect(result?.guildId).toBe("test-guild-id");
      expect(result?.guildName).toBe("Test Guild");
      expect(result?.notificationSettings).toEqual({
        daily: true,
        weekly: false,
        monthly: true,
      });
    });

    it("存在しないチャネルでnullを返す", async () => {
      // Arrange
      const params: DiscordChannelParams = {
        channelId: "non-existent-channel-id",
        organizationId: testOrganizationId,
      };

      // Act
      const result = await repo.findByChannelId(params);

      // Assert
      expect(result).toBeNull();
    });

    it("異なる組織のチャネルでnullを返す", async () => {
      // Arrange
      const channelId = "test-channel-id";
      const otherOrgId = "other-org-id";

      await db.insert(organizationsTable).values({
        id: otherOrgId,
        name: "Other Organization",
      });

      await db.insert(discordChannelsTable).values({
        id: channelId,
        organizationId: otherOrgId, // 異なる組織
        guildId: "test-guild-id",
        guildName: "Test Guild",
        channelId: "discord-channel-id",
        name: "test-channel",
        webhookId: "test-webhook-id",
        webhookTokenEnc: "encrypted-webhook-token",
        notificationSettings: {
          daily: true,
          weekly: false,
          monthly: true,
        },
      });

      const params: DiscordChannelParams = {
        channelId,
        organizationId: testOrganizationId,
      };

      // Act
      const result = await repo.findByChannelId(params);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("updateNotificationSettings", () => {
    it("通知設定を更新できる", async () => {
      // Arrange
      const channelId = "test-channel-id";
      const params: DiscordChannelParams = {
        channelId,
        organizationId: testOrganizationId,
      };

      await db.insert(discordChannelsTable).values({
        id: channelId,
        organizationId: testOrganizationId,
        guildId: "test-guild-id",
        guildName: "Test Guild",
        channelId: "discord-channel-id",
        name: "test-channel",
        webhookId: "test-webhook-id",
        webhookTokenEnc: "encrypted-webhook-token",
        notificationSettings: {
          daily: false,
          weekly: false,
          monthly: false,
        },
      });

      const input: UpdateNotificationSettingsInput = {
        notificationSettings: {
          daily: true,
          weekly: true,
          monthly: false,
        },
      };

      // Act
      const result = await repo.updateNotificationSettings(params, input);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(channelId);
      expect(result.notificationSettings).toEqual({
        daily: true,
        weekly: true,
        monthly: false,
      });

      // データベースからも確認
      const updatedChannel = await db
        .select()
        .from(discordChannelsTable)
        .where(eq(discordChannelsTable.id, channelId))
        .limit(1);

      expect(updatedChannel).toHaveLength(1);
      expect(updatedChannel[0]?.notificationSettings).toEqual({
        daily: true,
        weekly: true,
        monthly: false,
      });
    });

    it("存在しないチャネルでエラーを投げる", async () => {
      // Arrange
      const params: DiscordChannelParams = {
        channelId: "non-existent-channel-id",
        organizationId: testOrganizationId,
      };

      const input: UpdateNotificationSettingsInput = {
        notificationSettings: {
          daily: true,
          weekly: true,
          monthly: false,
        },
      };

      // Act & Assert
      await expect(
        repo.updateNotificationSettings(params, input)
      ).rejects.toThrow(DashboardDBError);
      await expect(
        repo.updateNotificationSettings(params, input)
      ).rejects.toThrow("Discord channel not found or access denied");
    });

    it("他の組織のチャネルでエラーを投げる", async () => {
      // Arrange
      const channelId = "test-channel-id";
      const otherOrgId = "other-org-id";

      await db.insert(organizationsTable).values({
        id: otherOrgId,
        name: "Other Organization",
      });

      await db.insert(discordChannelsTable).values({
        id: channelId,
        organizationId: otherOrgId, // 異なる組織
        guildId: "test-guild-id",
        guildName: "Test Guild",
        channelId: "discord-channel-id",
        name: "test-channel",
        webhookId: "test-webhook-id",
        webhookTokenEnc: "encrypted-webhook-token",
        notificationSettings: {
          daily: false,
          weekly: false,
          monthly: false,
        },
      });

      const params: DiscordChannelParams = {
        channelId,
        organizationId: testOrganizationId, // 異なる組織で更新を試行
      };

      const input: UpdateNotificationSettingsInput = {
        notificationSettings: {
          daily: true,
          weekly: true,
          monthly: false,
        },
      };

      // Act & Assert
      await expect(
        repo.updateNotificationSettings(params, input)
      ).rejects.toThrow(DashboardDBError);
    });

    it("updatedAtフィールドが更新される", async () => {
      // Arrange
      const channelId = "test-channel-id";
      const params: DiscordChannelParams = {
        channelId,
        organizationId: testOrganizationId,
      };

      const initialCreatedAt = new Date(Date.now() - 10000); // 10秒前
      await db.insert(discordChannelsTable).values({
        id: channelId,
        organizationId: testOrganizationId,
        guildId: "test-guild-id",
        guildName: "Test Guild",
        channelId: "discord-channel-id",
        name: "test-channel",
        webhookId: "test-webhook-id",
        webhookTokenEnc: "encrypted-webhook-token",
        notificationSettings: {
          daily: false,
          weekly: false,
          monthly: false,
        },
        createdAt: initialCreatedAt,
        updatedAt: initialCreatedAt,
      });

      // 更新前のupdatedAtを取得
      const beforeUpdate = await db
        .select({ updatedAt: discordChannelsTable.updatedAt })
        .from(discordChannelsTable)
        .where(eq(discordChannelsTable.id, channelId))
        .limit(1);

      // 少し待ってから更新実行
      await new Promise((resolve) => setTimeout(resolve, 100));

      const input: UpdateNotificationSettingsInput = {
        notificationSettings: {
          daily: true,
          weekly: false,
          monthly: false,
        },
      };

      // Act
      await repo.updateNotificationSettings(params, input);

      // Assert
      // 更新後のupdatedAtを取得
      const afterUpdate = await db
        .select({ updatedAt: discordChannelsTable.updatedAt })
        .from(discordChannelsTable)
        .where(eq(discordChannelsTable.id, channelId))
        .limit(1);

      // updatedAtが更新されていることを確認
      expect(afterUpdate[0]?.updatedAt.getTime()).toBeGreaterThan(
        beforeUpdate[0]?.updatedAt.getTime() ?? 0
      );
    });
  });

  describe("unlink", () => {
    it("Discordチャネルのリンクを解除できる", async () => {
      // Arrange
      const channelId = "test-channel-id";
      const params: DiscordChannelParams = {
        channelId,
        organizationId: testOrganizationId,
      };

      await db.insert(discordChannelsTable).values({
        id: channelId,
        organizationId: testOrganizationId,
        guildId: "test-guild-id",
        guildName: "Test Guild",
        channelId: "discord-channel-id",
        name: "test-channel",
        webhookId: "test-webhook-id",
        webhookTokenEnc: "encrypted-webhook-token",
        notificationSettings: {
          daily: false,
          weekly: false,
          monthly: false,
        },
      });

      // Act
      const result = await repo.unlink(params);

      // Assert
      expect(result).toBe(true);

      // データベースからチャネルが削除されていることを確認
      const remaining = await db
        .select()
        .from(discordChannelsTable)
        .where(eq(discordChannelsTable.id, channelId));

      expect(remaining).toHaveLength(0);
    });

    it("存在しないチャネルでfalseを返す", async () => {
      // Arrange
      const params: DiscordChannelParams = {
        channelId: "non-existent-channel-id",
        organizationId: testOrganizationId,
      };

      // Act
      const result = await repo.unlink(params);

      // Assert
      expect(result).toBe(false);
    });

    it("別の組織に属するチャネルでfalseを返す", async () => {
      // Arrange
      const channelId = "test-channel-id";
      const otherOrgId = "other-org-id";

      await db.insert(organizationsTable).values({
        id: otherOrgId,
        name: "Other Organization",
      });

      await db.insert(discordChannelsTable).values({
        id: channelId,
        organizationId: otherOrgId, // 異なる組織
        guildId: "test-guild-id",
        guildName: "Test Guild",
        channelId: "discord-channel-id",
        name: "test-channel",
        webhookId: "test-webhook-id",
        webhookTokenEnc: "encrypted-webhook-token",
        notificationSettings: {
          daily: false,
          weekly: false,
          monthly: false,
        },
      });

      const params: DiscordChannelParams = {
        channelId,
        organizationId: testOrganizationId, // 異なる組織で削除を試行
      };

      // Act
      const result = await repo.unlink(params);

      // Assert
      expect(result).toBe(false);

      // チャネルは削除されていないことを確認
      const remaining = await db
        .select()
        .from(discordChannelsTable)
        .where(eq(discordChannelsTable.id, channelId));

      expect(remaining).toHaveLength(1);
    });

    it("複数のチャネルがある中で指定したもののみを削除する", async () => {
      // Arrange
      const channelId1 = "test-channel-id-1";
      const channelId2 = "test-channel-id-2";

      await db.insert(discordChannelsTable).values([
        {
          id: channelId1,
          organizationId: testOrganizationId,
          guildId: "test-guild-id",
          guildName: "Test Guild",
          channelId: "discord-channel-id-1",
          name: "test-channel-1",
          webhookId: "test-webhook-id-1",
          webhookTokenEnc: "encrypted-webhook-token-1",
          notificationSettings: {
            daily: false,
            weekly: false,
            monthly: false,
          },
        },
        {
          id: channelId2,
          organizationId: testOrganizationId,
          guildId: "test-guild-id",
          guildName: "Test Guild",
          channelId: "discord-channel-id-2",
          name: "test-channel-2",
          webhookId: "test-webhook-id-2",
          webhookTokenEnc: "encrypted-webhook-token-2",
          notificationSettings: {
            daily: true,
            weekly: true,
            monthly: true,
          },
        },
      ]);

      const params: DiscordChannelParams = {
        channelId: channelId1,
        organizationId: testOrganizationId,
      };

      // Act
      const result = await repo.unlink(params);

      // Assert
      expect(result).toBe(true);

      // channelId1が削除されていることを確認
      const deletedChannel = await db
        .select()
        .from(discordChannelsTable)
        .where(eq(discordChannelsTable.id, channelId1));

      expect(deletedChannel).toHaveLength(0);

      // channelId2は残っていることを確認
      const remainingChannel = await db
        .select()
        .from(discordChannelsTable)
        .where(eq(discordChannelsTable.id, channelId2));

      expect(remainingChannel).toHaveLength(1);
      expect(remainingChannel[0]?.name).toBe("test-channel-2");
    });
  });

  describe("createOrUpdate", () => {
    it("新しいDiscordチャネルを作成できる", async () => {
      // Arrange
      const input: CreateDiscordChannelInput = {
        guildId: "test-guild-id",
        guildName: "Test Guild",
        channelId: "discord-channel-id",
        channelName: "test-channel",
        webhookId: "test-webhook-id",
        webhookToken: "test-webhook-token",
        notificationSettings: {
          daily: true,
          weekly: false,
          monthly: true,
        },
      };

      // Act
      const result = await repo.createOrUpdate(testOrganizationId, input);

      // Assert
      expect(result).toBeDefined();
      expect(result.organizationId).toBe(testOrganizationId);
      expect(result.guildId).toBe("test-guild-id");
      expect(result.guildName).toBe("Test Guild");
      expect(result.channelId).toBe("discord-channel-id");
      expect(result.name).toBe("test-channel");
      expect(result.webhookId).toBe("test-webhook-id");
      expect(result.webhookTokenEnc).toBeDefined(); // 暗号化されている
      expect(result.webhookTokenEnc).not.toBe("test-webhook-token"); // 元のトークンとは異なる
      expect(result.notificationSettings).toEqual({
        daily: true,
        weekly: false,
        monthly: true,
      });
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it("webhookTokenがnullの場合も作成できる", async () => {
      // Arrange
      const input: CreateDiscordChannelInput = {
        guildId: "test-guild-id",
        guildName: "Test Guild",
        channelId: "discord-channel-id",
        channelName: "test-channel",
        webhookId: "test-webhook-id",
        webhookToken: null,
      };

      // Act
      const result = await repo.createOrUpdate(testOrganizationId, input);

      // Assert
      expect(result).toBeDefined();
      expect(result.webhookTokenEnc).toBeNull();
    });

    it("デフォルトの通知設定が適用される", async () => {
      // Arrange
      const input: CreateDiscordChannelInput = {
        guildId: "test-guild-id",
        guildName: "Test Guild",
        channelId: "discord-channel-id",
        channelName: "test-channel",
        webhookId: "test-webhook-id",
        webhookToken: "test-webhook-token",
        // notificationSettingsを指定しない
      };

      // Act
      const result = await repo.createOrUpdate(testOrganizationId, input);

      // Assert
      expect(result.notificationSettings).toEqual({
        daily: true,
        weekly: true,
        monthly: true,
      });
    });

    it("既存チャネルを更新できる（onConflictDoUpdate）", async () => {
      // Arrange
      // 最初にチャネルを作成
      const initialInput: CreateDiscordChannelInput = {
        guildId: "test-guild-id",
        guildName: "Test Guild",
        channelId: "discord-channel-id",
        channelName: "initial-channel",
        webhookId: "initial-webhook-id",
        webhookToken: "initial-webhook-token",
        notificationSettings: {
          daily: false,
          weekly: false,
          monthly: false,
        },
      };

      const initialResult = await repo.createOrUpdate(
        testOrganizationId,
        initialInput
      );

      // updatedAtを更新
      initialResult.updatedAt = new Date("2023-01-01T00:00:00Z");
      await db
        .update(discordChannelsTable)
        .set({ updatedAt: initialResult.updatedAt })
        .where(eq(discordChannelsTable.id, initialResult.id));

      // 更新用のデータ
      const updateInput: CreateDiscordChannelInput = {
        guildId: "updated-guild-id",
        guildName: "Updated Guild",
        channelId: "discord-channel-id", // 同じchannelId
        channelName: "updated-channel",
        webhookId: "updated-webhook-id",
        webhookToken: "updated-webhook-token",
        notificationSettings: {
          daily: true,
          weekly: true,
          monthly: true,
        },
      };

      // Act
      const updateResult = await repo.createOrUpdate(
        testOrganizationId,
        updateInput
      );

      // Assert
      expect(updateResult).toBeDefined();
      expect(updateResult.id).toBe(initialResult.id); // 同じID
      expect(updateResult.guildId).toBe("updated-guild-id");
      expect(updateResult.guildName).toBe("Updated Guild");
      expect(updateResult.name).toBe("updated-channel");
      expect(updateResult.webhookId).toBe("updated-webhook-id");
      expect(updateResult.webhookTokenEnc).toBeDefined();
      expect(updateResult.webhookTokenEnc).not.toBe(
        initialResult.webhookTokenEnc
      ); // 新しいトークンで暗号化
      expect(updateResult.updatedAt.getTime()).toBeGreaterThan(
        initialResult.updatedAt.getTime()
      );

      // データベースに1つだけ存在することを確認
      const allChannels = await db
        .select()
        .from(discordChannelsTable)
        .where(eq(discordChannelsTable.organizationId, testOrganizationId));

      expect(allChannels).toHaveLength(1);
    });
  });

  describe("findWebhookDataByChannelId", () => {
    it("Webhook情報を取得できる", async () => {
      // Arrange
      const channelId = "test-channel-id";

      await db.insert(discordChannelsTable).values({
        id: channelId,
        organizationId: testOrganizationId,
        guildId: "test-guild-id",
        guildName: "Test Guild",
        channelId: "discord-channel-id",
        name: "test-channel",
        webhookId: "test-webhook-id",
        webhookTokenEnc: "encrypted-webhook-token",
        notificationSettings: {
          daily: true,
          weekly: false,
          monthly: true,
        },
      });

      // Act
      const result = await repo.findWebhookDataByChannelId(channelId);

      // Assert
      expect(result).toBeDefined();
      expect(result?.webhookId).toBe("test-webhook-id");
      expect(result?.webhookTokenEnc).toBe("encrypted-webhook-token");
    });

    it("存在しないチャネルでnullを返す", async () => {
      // Act
      const result = await repo.findWebhookDataByChannelId("non-existent-id");

      // Assert
      expect(result).toBeNull();
    });

    it("webhookIdがnullの場合もデータを返す", async () => {
      // Arrange
      const channelId = "test-channel-id";

      await db.insert(discordChannelsTable).values({
        id: channelId,
        organizationId: testOrganizationId,
        guildId: "test-guild-id",
        guildName: "Test Guild",
        channelId: "discord-channel-id",
        name: "test-channel",
        webhookId: null,
        webhookTokenEnc: null,
        notificationSettings: {
          daily: true,
          weekly: false,
          monthly: true,
        },
      });

      // Act
      const result = await repo.findWebhookDataByChannelId(channelId);

      // Assert
      expect(result).toBeDefined();
      expect(result?.webhookId).toBeNull();
      expect(result?.webhookTokenEnc).toBeNull();
    });
  });

  describe("findDecryptedWebhookDataByChannelId", () => {
    it("復号化されたWebhook情報を取得できる", async () => {
      // Arrange
      const originalToken = "test-webhook-token";

      // 実際の暗号化を使用してチャネルを作成
      const input: CreateDiscordChannelInput = {
        guildId: "test-guild-id",
        guildName: "Test Guild",
        channelId: "discord-channel-id",
        channelName: "test-channel",
        webhookId: "test-webhook-id",
        webhookToken: originalToken,
      };

      const createdChannel = await repo.createOrUpdate(
        testOrganizationId,
        input
      );

      // Act
      const result = await repo.findDecryptedWebhookDataByChannelId(
        createdChannel.id
      );

      // Assert
      expect(result).toBeDefined();
      expect(result?.webhookId).toBe("test-webhook-id");
      expect(result?.webhookToken).toBe(originalToken); // 復号化されたトークン
    });

    it("webhookIdまたはwebhookTokenEncがnullの場合nullを返す", async () => {
      // Arrange
      const testChannelId = "test-channel-id";

      await db.insert(discordChannelsTable).values({
        id: testChannelId,
        organizationId: testOrganizationId,
        guildId: "test-guild-id",
        guildName: "Test Guild",
        channelId: "discord-channel-id",
        name: "test-channel",
        webhookId: null,
        webhookTokenEnc: null,
        notificationSettings: {
          daily: true,
          weekly: false,
          monthly: true,
        },
      });

      // Act
      const result =
        await repo.findDecryptedWebhookDataByChannelId(testChannelId);

      // Assert
      expect(result).toBeNull();
    });

    it("存在しないチャネルでnullを返す", async () => {
      // Act
      const result =
        await repo.findDecryptedWebhookDataByChannelId("non-existent-id");

      // Assert
      expect(result).toBeNull();
    });

    it("webhookIdが存在するがwebhookTokenEncがnullの場合nullを返す", async () => {
      // Arrange
      const testChannelId = "test-channel-id";

      await db.insert(discordChannelsTable).values({
        id: testChannelId,
        organizationId: testOrganizationId,
        guildId: "test-guild-id",
        guildName: "Test Guild",
        channelId: "discord-channel-id",
        name: "test-channel",
        webhookId: "test-webhook-id",
        webhookTokenEnc: null, // webhookIdはあるがトークンはnull
        notificationSettings: {
          daily: true,
          weekly: false,
          monthly: true,
        },
      });

      // Act
      const result =
        await repo.findDecryptedWebhookDataByChannelId(testChannelId);

      // Assert
      expect(result).toBeNull();
    });
  });
});
