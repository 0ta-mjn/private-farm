import { describe, it, beforeEach, expect } from "vitest";
import { dbClient } from "@repo/db/client";
import { eq, and } from "@repo/db";
import {
  discordInstallationsTable,
  discordChannelsTable,
  organizationsTable,
  usersTable,
} from "@repo/db/schema";
import {
  unlinkDiscordGuild,
  getDiscordInstallations,
  updateDiscordChannelNotificationSettings,
  unlinkDiscordChannel,
} from "./discord.service";

const db = dbClient();

describe("Discord Service", () => {
  beforeEach(async () => {
    // テスト用のデータベースをリセット
    await db.transaction(async (tx) => {
      await tx.delete(discordChannelsTable);
      await tx.delete(discordInstallationsTable);
      await tx.delete(organizationsTable);
      await tx.delete(usersTable);
    });
  });

  describe("unlinkDiscordGuild", () => {
    it("正常にDiscordサーバーのリンクを解除できる", async () => {
      // テストデータの準備
      const organizationId = "test-org-id";
      const installationId = "test-installation-id";

      // 組織を作成
      await db.insert(organizationsTable).values({
        id: organizationId,
        name: "Test Organization",
        description: "Test Description",
      });

      // Discord インストールを作成
      await db.insert(discordInstallationsTable).values({
        id: installationId,
        organizationId: organizationId,
        guildId: "test-guild-id",
        guildName: "Test Guild",
        botUserId: "test-bot-user-id",
        accessTokenEnc: "encrypted-access-token",
        refreshTokenEnc: "encrypted-refresh-token",
        expiresAt: new Date(Date.now() + 3600000), // 1時間後
      });

      // unlinkDiscordGuild を実行
      const result = await unlinkDiscordGuild(
        db,
        organizationId,
        installationId
      );

      // 結果の検証
      expect(result).toBe(true);

      // データベースからインストールが削除されていることを確認
      const remaining = await db
        .select()
        .from(discordInstallationsTable)
        .where(
          and(
            eq(discordInstallationsTable.organizationId, organizationId),
            eq(discordInstallationsTable.id, installationId)
          )
        );

      expect(remaining).toHaveLength(0);
    });

    it("存在しないインストールIDを指定した場合はfalseを返す", async () => {
      // テストデータの準備
      const organizationId = "test-org-id";
      const nonExistentInstallationId = "non-existent-installation-id";

      // 組織を作成
      await db.insert(organizationsTable).values({
        id: organizationId,
        name: "Test Organization",
        description: "Test Description",
      });

      // unlinkDiscordGuild を実行（存在しないインストールID）
      const result = await unlinkDiscordGuild(
        db,
        organizationId,
        nonExistentInstallationId
      );

      // 結果の検証
      expect(result).toBe(false);
    });

    it("複数のインストールがある中で指定したもののみを削除する", async () => {
      // テストデータの準備
      const organizationId = "test-org-id";
      const installationId1 = "test-installation-id-1";
      const installationId2 = "test-installation-id-2";

      // 組織を作成
      await db.insert(organizationsTable).values({
        id: organizationId,
        name: "Test Organization",
        description: "Test Description",
      });

      // 複数のDiscord インストールを作成
      await db.insert(discordInstallationsTable).values([
        {
          id: installationId1,
          organizationId: organizationId,
          guildId: "test-guild-id-1",
          guildName: "Test Guild 1",
          botUserId: "test-bot-user-id-1",
          accessTokenEnc: "encrypted-access-token-1",
          refreshTokenEnc: "encrypted-refresh-token-1",
          expiresAt: new Date(Date.now() + 3600000), // 1時間後
        },
        {
          id: installationId2,
          organizationId: organizationId,
          guildId: "test-guild-id-2",
          guildName: "Test Guild 2",
          botUserId: "test-bot-user-id-2",
          accessTokenEnc: "encrypted-access-token-2",
          refreshTokenEnc: "encrypted-refresh-token-2",
          expiresAt: new Date(Date.now() + 3600000), // 1時間後
        },
      ]);

      // installationId1を削除
      const result = await unlinkDiscordGuild(
        db,
        organizationId,
        installationId1
      );

      // 結果の検証
      expect(result).toBe(true);

      // installationId1が削除されていることを確認
      const deletedInstallation = await db
        .select()
        .from(discordInstallationsTable)
        .where(eq(discordInstallationsTable.id, installationId1));

      expect(deletedInstallation).toHaveLength(0);

      // installationId2が残っていることを確認
      const remainingInstallation = await db
        .select()
        .from(discordInstallationsTable)
        .where(eq(discordInstallationsTable.id, installationId2));

      expect(remainingInstallation).toHaveLength(1);
      expect(remainingInstallation[0]?.id).toBe(installationId2);
    });
  });

  describe("getDiscordInstallations", () => {
    it("組織のDiscord連携情報をチャネル情報と共に取得できる", async () => {
      // テストデータの準備
      const organizationId = "test-org-id";
      const installationId1 = "test-installation-id-1";
      const installationId2 = "test-installation-id-2";

      // 組織を作成
      await db.insert(organizationsTable).values({
        id: organizationId,
        name: "Test Organization",
        description: "Test Description",
      });

      // Discord インストールを作成
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 3600000); // 1時間後

      await db.insert(discordInstallationsTable).values([
        {
          id: installationId1,
          organizationId: organizationId,
          guildId: "test-guild-id-1",
          guildName: "Test Guild 1",
          botUserId: "test-bot-user-id-1",
          accessTokenEnc: "encrypted-access-token-1",
          refreshTokenEnc: "encrypted-refresh-token-1",
          expiresAt: expiresAt,
          installedAt: now,
        },
        {
          id: installationId2,
          organizationId: organizationId,
          guildId: "test-guild-id-2",
          guildName: "Test Guild 2",
          botUserId: "test-bot-user-id-2",
          accessTokenEnc: "encrypted-access-token-2",
          refreshTokenEnc: "encrypted-refresh-token-2",
          expiresAt: expiresAt,
          installedAt: new Date(now.getTime() + 1000), // 1秒後
        },
      ]);

      // Discord チャネルを作成
      await db.insert(discordChannelsTable).values([
        {
          id: "channel-1-1",
          installationId: installationId1,
          channelId: "discord-channel-1-1",
          channelName: "general",
          notificationSettings: {
            daily: true,
            weekly: false,
            monthly: true,
          },
        },
        {
          id: "channel-1-2",
          installationId: installationId1,
          channelId: "discord-channel-1-2",
          channelName: "alerts",
          notificationSettings: {
            daily: true,
            weekly: true,
            monthly: true,
          },
        },
        {
          id: "channel-2-1",
          installationId: installationId2,
          channelId: "discord-channel-2-1",
          channelName: "farm-updates",
          notificationSettings: {
            daily: false,
            weekly: true,
            monthly: false,
          },
        },
      ]);

      // getDiscordInstallations を実行
      const installations = await getDiscordInstallations(db, organizationId);

      // 結果の検証
      expect(installations).toHaveLength(2);

      // インストール1の検証
      const installation1 = installations.find((i) => i.id === installationId1);
      expect(installation1).toBeDefined();
      expect(installation1?.guildId).toBe("test-guild-id-1");
      expect(installation1?.guildName).toBe("Test Guild 1");
      expect(installation1?.channels).toHaveLength(2);

      // チャネル情報の検証
      const generalChannel = installation1?.channels.find(
        (c) => c.channelName === "general"
      );
      expect(generalChannel).toBeDefined();
      expect(generalChannel?.notificationSettings).toEqual({
        daily: true,
        weekly: false,
        monthly: true,
      });

      const alertsChannel = installation1?.channels.find(
        (c) => c.channelName === "alerts"
      );
      expect(alertsChannel).toBeDefined();
      expect(alertsChannel?.notificationSettings).toEqual({
        daily: true,
        weekly: true,
        monthly: true,
      });

      // インストール2の検証
      const installation2 = installations.find((i) => i.id === installationId2);
      expect(installation2).toBeDefined();
      expect(installation2?.guildId).toBe("test-guild-id-2");
      expect(installation2?.guildName).toBe("Test Guild 2");
      expect(installation2?.channels).toHaveLength(1);

      const farmUpdatesChannel = installation2?.channels.find(
        (c) => c.channelName === "farm-updates"
      );
      expect(farmUpdatesChannel).toBeDefined();
      expect(farmUpdatesChannel?.notificationSettings).toEqual({
        daily: false,
        weekly: true,
        monthly: false,
      });
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

      // getDiscordInstallations を実行
      const installations = await getDiscordInstallations(db, organizationId);

      // 結果の検証
      expect(installations).toHaveLength(0);
      expect(installations).toEqual([]);
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

      // 各組織にDiscord インストールを作成
      await db.insert(discordInstallationsTable).values([
        {
          id: "installation-org1",
          organizationId: organizationId1,
          guildId: "guild-org1",
          guildName: "Guild Org 1",
          botUserId: "bot-org1",
          accessTokenEnc: "token-org1",
          refreshTokenEnc: "refresh-org1",
          expiresAt: new Date(Date.now() + 3600000),
        },
        {
          id: "installation-org2",
          organizationId: organizationId2,
          guildId: "guild-org2",
          guildName: "Guild Org 2",
          botUserId: "bot-org2",
          accessTokenEnc: "token-org2",
          refreshTokenEnc: "refresh-org2",
          expiresAt: new Date(Date.now() + 3600000),
        },
      ]);

      // organizationId1の連携情報を取得
      const installations = await getDiscordInstallations(db, organizationId1);

      // 結果の検証（organizationId1の連携のみ取得されることを確認）
      expect(installations).toHaveLength(1);
      expect(installations[0]?.id).toBe("installation-org1");
      expect(installations[0]?.guildName).toBe("Guild Org 1");
      expect(installations[0]?.channels).toEqual([]); // チャネルが存在しないため空配列
    });

    it("チャネルが存在しないインストールも正しく取得できる", async () => {
      // テストデータの準備
      const organizationId = "test-org-id";
      const installationId = "test-installation-id";

      // 組織を作成
      await db.insert(organizationsTable).values({
        id: organizationId,
        name: "Test Organization",
        description: "Test Description",
      });

      // Discord インストールを作成（チャネルなし）
      await db.insert(discordInstallationsTable).values({
        id: installationId,
        organizationId: organizationId,
        guildId: "test-guild-id",
        guildName: "Test Guild",
        botUserId: "test-bot-user-id",
        accessTokenEnc: "encrypted-access-token",
        refreshTokenEnc: "encrypted-refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
      });

      // getDiscordInstallations を実行
      const installations = await getDiscordInstallations(db, organizationId);

      // 結果の検証
      expect(installations).toHaveLength(1);
      expect(installations[0]?.id).toBe(installationId);
      expect(installations[0]?.guildId).toBe("test-guild-id");
      expect(installations[0]?.guildName).toBe("Test Guild");
      expect(installations[0]?.channels).toHaveLength(0);
      expect(installations[0]?.channels).toEqual([]);
    });
  });

  describe("updateDiscordChannelNotificationSettings", () => {
    it("正常にチャネルの通知設定を更新できる", async () => {
      // テストデータの準備
      const organizationId = "test-org-id";
      const installationId = "test-installation-id";
      const channelId = "test-channel-id";

      // 組織を作成
      await db.insert(organizationsTable).values({
        id: organizationId,
        name: "Test Organization",
        description: "Test Description",
      });

      // Discord インストールを作成
      await db.insert(discordInstallationsTable).values({
        id: installationId,
        organizationId: organizationId,
        guildId: "test-guild-id",
        guildName: "Test Guild",
        botUserId: "test-bot-user-id",
        accessTokenEnc: "encrypted-access-token",
        refreshTokenEnc: "encrypted-refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
      });

      // Discord チャネルを作成
      await db.insert(discordChannelsTable).values({
        id: channelId,
        installationId: installationId,
        channelId: "discord-channel-id",
        channelName: "test-channel",
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
      const installationId = "test-installation-id";
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

      // organizationId1のDiscord インストールを作成
      await db.insert(discordInstallationsTable).values({
        id: installationId,
        organizationId: organizationId1,
        guildId: "test-guild-id",
        guildName: "Test Guild",
        botUserId: "test-bot-user-id",
        accessTokenEnc: "encrypted-access-token",
        refreshTokenEnc: "encrypted-refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
      });

      // Discord チャネルを作成
      await db.insert(discordChannelsTable).values({
        id: channelId,
        installationId: installationId,
        channelId: "discord-channel-id",
        channelName: "test-channel",
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
      const installationId = "test-installation-id";
      const channelId = "test-channel-id";

      // 組織を作成
      await db.insert(organizationsTable).values({
        id: organizationId,
        name: "Test Organization",
        description: "Test Description",
      });

      // Discord インストールを作成
      await db.insert(discordInstallationsTable).values({
        id: installationId,
        organizationId: organizationId,
        guildId: "test-guild-id",
        guildName: "Test Guild",
        botUserId: "test-bot-user-id",
        accessTokenEnc: "encrypted-access-token",
        refreshTokenEnc: "encrypted-refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
      });

      // Discord チャネルを作成（初期設定あり）
      const initialSettings = {
        daily: true,
        weekly: false,
        monthly: true,
      };

      await db.insert(discordChannelsTable).values({
        id: channelId,
        installationId: installationId,
        channelId: "discord-channel-id",
        channelName: "test-channel",
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
      const installationId = "test-installation-id";
      const channelId = "test-channel-id";

      // 組織を作成
      await db.insert(organizationsTable).values({
        id: organizationId,
        name: "Test Organization",
        description: "Test Description",
      });

      // Discord インストールを作成
      await db.insert(discordInstallationsTable).values({
        id: installationId,
        organizationId: organizationId,
        guildId: "test-guild-id",
        guildName: "Test Guild",
        botUserId: "test-bot-user-id",
        accessTokenEnc: "encrypted-access-token",
        refreshTokenEnc: "encrypted-refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
      });

      // Discord チャネルを作成
      const initialCreatedAt = new Date(Date.now() - 10000); // 10秒前
      await db.insert(discordChannelsTable).values({
        id: channelId,
        installationId: installationId,
        channelId: "discord-channel-id",
        channelName: "test-channel",
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
      const installationId = "test-installation-id";
      const channelId = "test-channel-id";

      // 組織を作成
      await db.insert(organizationsTable).values({
        id: organizationId,
        name: "Test Organization",
        description: "Test Description",
      });

      // Discord インストールを作成
      await db.insert(discordInstallationsTable).values({
        id: installationId,
        organizationId: organizationId,
        guildId: "test-guild-id",
        guildName: "Test Guild",
        botUserId: "test-bot-user-id",
        accessTokenEnc: "encrypted-access-token",
        refreshTokenEnc: "encrypted-refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
      });

      // Discord チャネルを作成
      await db.insert(discordChannelsTable).values({
        id: channelId,
        installationId: installationId,
        channelId: "discord-channel-id",
        channelName: "test-channel",
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

    it("存在しないチャネルIDを指定した場合はエラーをスローする", async () => {
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
      await expect(
        unlinkDiscordChannel(db, organizationId, nonExistentChannelId)
      ).rejects.toThrow("指定されたチャネルが見つからないか、権限がありません");
    });

    it("別の組織に属するチャネルIDを指定した場合はエラーをスローする", async () => {
      // テストデータの準備
      const organizationId1 = "test-org-id-1";
      const organizationId2 = "test-org-id-2";
      const installationId1 = "test-installation-id-1";
      const installationId2 = "test-installation-id-2";
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

      // Discord インストールを作成
      await db.insert(discordInstallationsTable).values([
        {
          id: installationId1,
          organizationId: organizationId1,
          guildId: "test-guild-id-1",
          guildName: "Test Guild 1",
          botUserId: "test-bot-user-id-1",
          accessTokenEnc: "encrypted-access-token-1",
          refreshTokenEnc: "encrypted-refresh-token-1",
          expiresAt: new Date(Date.now() + 3600000),
        },
        {
          id: installationId2,
          organizationId: organizationId2,
          guildId: "test-guild-id-2",
          guildName: "Test Guild 2",
          botUserId: "test-bot-user-id-2",
          accessTokenEnc: "encrypted-access-token-2",
          refreshTokenEnc: "encrypted-refresh-token-2",
          expiresAt: new Date(Date.now() + 3600000),
        },
      ]);

      // Discord チャネルを作成
      await db.insert(discordChannelsTable).values([
        {
          id: channelId1,
          installationId: installationId1,
          channelId: "discord-channel-id-1",
          channelName: "test-channel-1",
          notificationSettings: {
            daily: false,
            weekly: false,
            monthly: false,
          },
        },
        {
          id: channelId2,
          installationId: installationId2,
          channelId: "discord-channel-id-2",
          channelName: "test-channel-2",
          notificationSettings: {
            daily: false,
            weekly: false,
            monthly: false,
          },
        },
      ]);

      // 組織1から組織2のチャネルを削除しようとする
      await expect(
        unlinkDiscordChannel(db, organizationId1, channelId2)
      ).rejects.toThrow("指定されたチャネルが見つからないか、権限がありません");

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
      const installationId = "test-installation-id";
      const channelId1 = "test-channel-id-1";
      const channelId2 = "test-channel-id-2";

      // 組織を作成
      await db.insert(organizationsTable).values({
        id: organizationId,
        name: "Test Organization",
        description: "Test Description",
      });

      // Discord インストールを作成
      await db.insert(discordInstallationsTable).values({
        id: installationId,
        organizationId: organizationId,
        guildId: "test-guild-id",
        guildName: "Test Guild",
        botUserId: "test-bot-user-id",
        accessTokenEnc: "encrypted-access-token",
        refreshTokenEnc: "encrypted-refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
      });

      // 複数のDiscord チャネルを作成
      await db.insert(discordChannelsTable).values([
        {
          id: channelId1,
          installationId: installationId,
          channelId: "discord-channel-id-1",
          channelName: "test-channel-1",
          notificationSettings: {
            daily: false,
            weekly: false,
            monthly: false,
          },
        },
        {
          id: channelId2,
          installationId: installationId,
          channelId: "discord-channel-id-2",
          channelName: "test-channel-2",
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
      expect(remainingChannel[0]?.channelName).toBe("test-channel-2");
    });

    it("無効なchannelIdフォーマットでエラーをスローする", async () => {
      const organizationId = "test-org-id";

      // 組織を作成
      await db.insert(organizationsTable).values({
        id: organizationId,
        name: "Test Organization",
        description: "Test Description",
      });

      // 空のchannelIdでテスト
      await expect(
        unlinkDiscordChannel(db, organizationId, "")
      ).rejects.toThrow("指定されたチャネルが見つからないか、権限がありません");
    });
  });
});
