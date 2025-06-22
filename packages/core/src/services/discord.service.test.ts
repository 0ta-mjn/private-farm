import { describe, it, beforeEach, expect } from "vitest";
import { dbClient } from "@repo/db/client";
import { eq } from "@repo/db";
import {
  discordChannelsTable,
  organizationsTable,
  usersTable,
} from "@repo/db/schema";
import {
  getDiscordChannels,
  updateDiscordChannelNotificationSettings,
  unlinkDiscordChannel,
} from "./discord.service";

const db = dbClient();

describe("Discord Service", () => {
  beforeEach(async () => {
    // テスト用のデータベースをリセット
    await db.transaction(async (tx) => {
      await tx.delete(discordChannelsTable);
      await tx.delete(organizationsTable);
      await tx.delete(usersTable);
    });
  });

  describe("getDiscordChannels", () => {
    it("組織のDiscordチャネル情報を取得できる", async () => {
      // テストデータの準備
      const organizationId = "test-org-id";

      // 組織を作成
      await db.insert(organizationsTable).values({
        id: organizationId,
        name: "Test Organization",
        description: "Test Description",
      });

      const now = new Date();

      // Discord チャネルを作成（新しいスキーマに合わせて）
      await db.insert(discordChannelsTable).values([
        {
          id: "channel-1-1",
          organizationId: organizationId,
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
          organizationId: organizationId,
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
          organizationId: organizationId,
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

      // getDiscordChannels を実行
      const channels = await getDiscordChannels(db, organizationId);

      // 結果の検証
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
      // テストデータの準備
      const organizationId = "test-org-id";

      // 組織を作成（Discord連携なし）
      await db.insert(organizationsTable).values({
        id: organizationId,
        name: "Test Organization",
        description: "Test Description",
      });

      // getDiscordChannels を実行
      const channels = await getDiscordChannels(db, organizationId);

      // 結果の検証
      expect(channels).toHaveLength(0);
      expect(channels).toEqual([]);
    });

    it("指定した組織の連携のみを取得する", async () => {
      // テストデータの準備
      const organizationId1 = "test-org-id-1";
      const organizationId2 = "test-org-id-2";

      // 組織を作成
      await db.insert(organizationsTable).values([
        {
          id: organizationId1,
          name: "Test Organization 1",
          description: "Test Description 1",
        },
        {
          id: organizationId2,
          name: "Test Organization 2",
          description: "Test Description 2",
        },
      ]);

      // 各組織にDiscordチャネルを作成
      await db.insert(discordChannelsTable).values([
        {
          id: "channel-org1",
          organizationId: organizationId1,
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

      // organizationId1の連携情報を取得
      const channels = await getDiscordChannels(db, organizationId1);

      // 結果の検証（organizationId1の連携のみ取得されることを確認）
      expect(channels).toHaveLength(1);
      expect(channels[0]?.guildId).toBe("guild-org1");
      expect(channels[0]?.guildName).toBe("Guild Org 1");
      expect(channels[0]?.name).toBe("general");
    });

    it("チャネルが存在しない場合は空配列を返す", async () => {
      // テストデータの準備
      const organizationId = "test-org-id";

      // 組織を作成（Discordチャネルなし）
      await db.insert(organizationsTable).values({
        id: organizationId,
        name: "Test Organization",
        description: "Test Description",
      });

      // getDiscordChannels を実行
      const channels = await getDiscordChannels(db, organizationId);

      // 結果の検証
      expect(channels).toHaveLength(0);
      expect(channels).toEqual([]);
    });
  });

  describe("updateDiscordChannelNotificationSettings", () => {
    it("正常にチャネルの通知設定を更新できる", async () => {
      // テストデータの準備
      const organizationId = "test-org-id";
      const channelId = "test-channel-id";

      // 組織を作成
      await db.insert(organizationsTable).values({
        id: organizationId,
        name: "Test Organization",
        description: "Test Description",
      });

      // Discord チャネルを作成
      await db.insert(discordChannelsTable).values({
        id: channelId,
        organizationId: organizationId,
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

      // updateDiscordChannelNotificationSettings を実行
      const newSettings = {
        daily: true,
        weekly: true,
        monthly: false,
      };

      const result = await updateDiscordChannelNotificationSettings(
        db,
        organizationId,
        {
          channelId,
          notificationSettings: newSettings,
        }
      );

      // 結果の検証
      expect(result).toBeDefined();
      expect(result!.id).toBe(channelId);
      expect(result!.notificationSettings).toEqual(newSettings);

      // データベースから直接取得して確認
      const updatedChannel = await db
        .select()
        .from(discordChannelsTable)
        .where(eq(discordChannelsTable.id, channelId))
        .limit(1);

      expect(updatedChannel).toHaveLength(1);
      expect(updatedChannel[0]?.notificationSettings).toEqual(newSettings);
    });

    it("存在しないチャネルIDを指定した場合はエラーを投げる", async () => {
      // テストデータの準備
      const organizationId = "test-org-id";
      const nonExistentChannelId = "non-existent-channel-id";

      // 組織を作成
      await db.insert(organizationsTable).values({
        id: organizationId,
        name: "Test Organization",
        description: "Test Description",
      });

      // updateDiscordChannelNotificationSettings を実行（存在しないチャネルID）
      const newSettings = {
        daily: true,
        weekly: true,
        monthly: false,
      };

      await expect(
        updateDiscordChannelNotificationSettings(db, organizationId, {
          channelId: nonExistentChannelId,
          notificationSettings: newSettings,
        })
      ).rejects.toThrow("指定されたチャネルが見つからないか、権限がありません");
    });

    it("他の組織のチャネルを更新しようとした場合はエラーを投げる", async () => {
      // テストデータの準備
      const organizationId1 = "test-org-id-1";
      const organizationId2 = "test-org-id-2";
      const channelId = "test-channel-id";

      // 組織を作成
      await db.insert(organizationsTable).values([
        {
          id: organizationId1,
          name: "Test Organization 1",
          description: "Test Description 1",
        },
        {
          id: organizationId2,
          name: "Test Organization 2",
          description: "Test Description 2",
        },
      ]);

      // organizationId1のDiscordチャネルを作成
      await db.insert(discordChannelsTable).values({
        id: channelId,
        organizationId: organizationId1,
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

      // organizationId2からチャネルを更新しようとする
      const newSettings = {
        daily: true,
        weekly: true,
        monthly: false,
      };

      await expect(
        updateDiscordChannelNotificationSettings(
          db,
          organizationId2, // 異なる組織ID
          {
            channelId,
            notificationSettings: newSettings,
          }
        )
      ).rejects.toThrow("指定されたチャネルが見つからないか、権限がありません");
    });

    it("部分的な通知設定の更新ができる", async () => {
      // テストデータの準備
      const organizationId = "test-org-id";
      const channelId = "test-channel-id";

      // 組織を作成
      await db.insert(organizationsTable).values({
        id: organizationId,
        name: "Test Organization",
        description: "Test Description",
      });

      // Discord チャネルを作成（初期設定あり）
      const initialSettings = {
        daily: true,
        weekly: false,
        monthly: true,
      };

      await db.insert(discordChannelsTable).values({
        id: channelId,
        organizationId: organizationId,
        guildId: "test-guild-id",
        guildName: "Test Guild",
        channelId: "discord-channel-id",
        name: "test-channel",
        webhookId: "test-webhook-id",
        webhookTokenEnc: "encrypted-webhook-token",
        notificationSettings: initialSettings,
      });

      // 一部の設定のみ更新
      const updatedSettings = {
        daily: false,
        weekly: true,
        monthly: true,
      };

      const result = await updateDiscordChannelNotificationSettings(
        db,
        organizationId,
        {
          channelId,
          notificationSettings: updatedSettings,
        }
      );

      // 結果の検証
      expect(result).toBeDefined();
      expect(result!.id).toBe(channelId);
      expect(result!.notificationSettings).toEqual(updatedSettings);

      // 更新された設定が期待通りであることを確認
      expect(result!.notificationSettings.daily).toBe(false); // 変更された
      expect(result!.notificationSettings.weekly).toBe(true); // 変更された
      expect(result!.notificationSettings.monthly).toBe(true); // 変更されていない
    });

    it("updatedAtフィールドが更新される", async () => {
      // テストデータの準備
      const organizationId = "test-org-id";
      const channelId = "test-channel-id";

      // 組織を作成
      await db.insert(organizationsTable).values({
        id: organizationId,
        name: "Test Organization",
        description: "Test Description",
      });

      // Discord チャネルを作成
      const initialCreatedAt = new Date(Date.now() - 10000); // 10秒前
      await db.insert(discordChannelsTable).values({
        id: channelId,
        organizationId: organizationId,
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

      await updateDiscordChannelNotificationSettings(db, organizationId, {
        channelId,
        notificationSettings: {
          daily: true,
          weekly: false,
          monthly: false,
        },
      });

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

  describe("unlinkDiscordChannel", () => {
    it("正常にDiscordチャネルのリンクを解除できる", async () => {
      // テストデータの準備
      const organizationId = "test-org-id";
      const channelId = "test-channel-id";

      // 組織を作成
      await db.insert(organizationsTable).values({
        id: organizationId,
        name: "Test Organization",
        description: "Test Description",
      });

      // Discord チャネルを作成
      await db.insert(discordChannelsTable).values({
        id: channelId,
        organizationId: organizationId,
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

      // unlinkDiscordChannel を実行
      const result = await unlinkDiscordChannel(db, organizationId, channelId);

      // 結果の検証
      expect(result).toBe(true);

      // データベースからチャネルが削除されていることを確認
      const remaining = await db
        .select()
        .from(discordChannelsTable)
        .where(eq(discordChannelsTable.id, channelId));

      expect(remaining).toHaveLength(0);
    });

    it("存在しないチャネルIDを指定した場合はfalseを返す", async () => {
      // テストデータの準備
      const organizationId = "test-org-id";
      const nonExistentChannelId = "non-existent-channel-id";

      // 組織を作成
      await db.insert(organizationsTable).values({
        id: organizationId,
        name: "Test Organization",
        description: "Test Description",
      });

      // unlinkDiscordChannel を実行（存在しないチャネルID）
      const res = await unlinkDiscordChannel(
        db,
        organizationId,
        nonExistentChannelId
      );
      // 結果の検証
      expect(res).toBe(false);
    });

    it("別の組織に属するチャネルIDを指定した場合はfalseを返す", async () => {
      // テストデータの準備
      const organizationId1 = "test-org-id-1";
      const organizationId2 = "test-org-id-2";
      const channelId1 = "test-channel-id-1";
      const channelId2 = "test-channel-id-2";

      // 組織を作成
      await db.insert(organizationsTable).values([
        {
          id: organizationId1,
          name: "Test Organization 1",
          description: "Test Description 1",
        },
        {
          id: organizationId2,
          name: "Test Organization 2",
          description: "Test Description 2",
        },
      ]);

      // Discord チャネルを作成
      await db.insert(discordChannelsTable).values([
        {
          id: channelId1,
          organizationId: organizationId1,
          guildId: "test-guild-id-1",
          guildName: "Test Guild 1",
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
          organizationId: organizationId2,
          guildId: "test-guild-id-2",
          guildName: "Test Guild 2",
          channelId: "discord-channel-id-2",
          name: "test-channel-2",
          webhookId: "test-webhook-id-2",
          webhookTokenEnc: "encrypted-webhook-token-2",
          notificationSettings: {
            daily: false,
            weekly: false,
            monthly: false,
          },
        },
      ]);

      // 組織1から組織2のチャネルを削除しようとする
      const res = await unlinkDiscordChannel(db, organizationId1, channelId2);
      // 結果の検証
      expect(res).toBe(false);

      // 組織2のチャネルは削除されていないことを確認
      const remaining = await db
        .select()
        .from(discordChannelsTable)
        .where(eq(discordChannelsTable.id, channelId2));

      expect(remaining).toHaveLength(1);
    });

    it("複数のチャネルがある中で指定したもののみを削除する", async () => {
      // テストデータの準備
      const organizationId = "test-org-id";
      const channelId1 = "test-channel-id-1";
      const channelId2 = "test-channel-id-2";

      // 組織を作成
      await db.insert(organizationsTable).values({
        id: organizationId,
        name: "Test Organization",
        description: "Test Description",
      });

      // 複数のDiscord チャネルを作成
      await db.insert(discordChannelsTable).values([
        {
          id: channelId1,
          organizationId: organizationId,
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
          organizationId: organizationId,
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

      // channelId1を削除
      const result = await unlinkDiscordChannel(db, organizationId, channelId1);

      // 結果の検証
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
});
