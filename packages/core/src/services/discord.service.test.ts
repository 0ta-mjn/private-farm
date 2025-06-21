import { describe, it, beforeEach, expect } from "vitest";
import { dbClient } from "@repo/db/client";
import { eq, and } from "@repo/db";
import {
  discordInstallationsTable,
  organizationsTable,
  usersTable,
} from "@repo/db/schema";
import { unlinkDiscordGuild, getDiscordInstallations } from "./discord.service";

const db = dbClient();

describe("Discord Service", () => {
  beforeEach(async () => {
    // テスト用のデータベースをリセット
    await db.transaction(async (tx) => {
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
    it("組織のDiscord連携情報を取得できる", async () => {
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

      // getDiscordInstallations を実行
      const installations = await getDiscordInstallations(db, organizationId);

      // 結果の検証
      expect(installations).toHaveLength(2);
      expect(installations[0]?.id).toBe(installationId1);
      expect(installations[0]?.guildId).toBe("test-guild-id-1");
      expect(installations[0]?.guildName).toBe("Test Guild 1");
      expect(installations[1]?.id).toBe(installationId2);
      expect(installations[1]?.guildId).toBe("test-guild-id-2");
      expect(installations[1]?.guildName).toBe("Test Guild 2");

      // installedAtの順序で並んでいることを確認
      expect(installations[0]?.installedAt).toEqual(now);
      expect(installations[1]?.installedAt).toEqual(
        new Date(now.getTime() + 1000)
      );
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
    });
  });
});
