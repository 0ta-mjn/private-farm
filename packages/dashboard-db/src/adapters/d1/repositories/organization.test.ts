import { describe, it, expect, beforeEach } from "vitest";
import {
  organizationsTable,
  organizationMembersTable,
  usersTable,
  discordChannelsTable,
} from "../schema";
import { createTestDashboardD1Client } from "../testing";
import { D1OrganizationRepo } from "./organization";
import {
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from "../../../interfaces";
import { DashboardDBError } from "../../../errors";
import { eq } from "drizzle-orm";
import { encrypt } from "../../../encryption";

const db = await createTestDashboardD1Client();
const testEncryptionKey =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const repo = new D1OrganizationRepo(db, testEncryptionKey);

describe("D1OrganizationRepo", () => {
  let testUserId: string;
  let testOtherUserId: string;

  beforeEach(async () => {
    // テスト用のデータベースをリセット
    await db.delete(discordChannelsTable);
    await db.delete(organizationMembersTable);
    await db.delete(organizationsTable);
    await db.delete(usersTable);

    // テストデータをセットアップ
    testUserId = "test-user-id";
    testOtherUserId = "test-other-user-id";

    // ユーザー作成
    await db.insert(usersTable).values([
      {
        id: testUserId,
        name: "テストユーザー",
      },
      {
        id: testOtherUserId,
        name: "他のユーザー",
      },
    ]);
  });

  describe("create", () => {
    it("組織を作成し、ユーザーを管理者として追加できる", async () => {
      // Arrange
      const input: CreateOrganizationInput = {
        organizationName: "テスト農園",
        description: "テスト用の農園です",
      };

      // Act
      const result = await repo.create(testUserId, input);

      // Assert
      expect(result).toBeDefined();
      expect(result.organization.name).toBe("テスト農園");
      expect(result.organization.description).toBe("テスト用の農園です");
      expect(result.organization.id).toMatch(/^org_/);
      expect(result.membership.userId).toBe(testUserId);
      expect(result.membership.organizationId).toBe(result.organization.id);
      expect(result.membership.role).toBe("admin");
    });

    it("最小限の情報で組織を作成できる", async () => {
      // Arrange
      const input: CreateOrganizationInput = {
        organizationName: "ミニマル農園",
      };

      // Act
      const result = await repo.create(testUserId, input);

      // Assert
      expect(result).toBeDefined();
      expect(result.organization.name).toBe("ミニマル農園");
      expect(result.organization.description).toBeNull();
      expect(result.membership.userId).toBe(testUserId);
      expect(result.membership.role).toBe("admin");
    });

    it("説明フィールドを明示的にundefinedで設定して組織を作成できる", async () => {
      // Arrange
      const input: CreateOrganizationInput = {
        organizationName: "アンデファインド農園",
        description: undefined,
      };

      // Act
      const result = await repo.create(testUserId, input);

      // Assert
      expect(result).toBeDefined();
      expect(result.organization.name).toBe("アンデファインド農園");
      expect(result.organization.description).toBeNull();
      expect(result.membership.userId).toBe(testUserId);
      expect(result.membership.role).toBe("admin");
    });
  });

  describe("listByUser", () => {
    beforeEach(async () => {
      // テスト用組織データを作成
      const { organization: org1 } = await repo.create(testUserId, {
        organizationName: "第1農園",
        description: "最初の農園",
      });
      const { organization: org2 } = await repo.create(testUserId, {
        organizationName: "第2農園",
        description: "2番目の農園",
      });
      // createdAtを調整
      await db
        .update(organizationsTable)
        .set({ createdAt: new Date("2023-01-01T00:00:00Z") })
        .where(eq(organizationsTable.id, org1.id));
      await db
        .update(organizationsTable)
        .set({ createdAt: new Date("2023-02-01T00:00:00Z") })
        .where(eq(organizationsTable.id, org2.id));

      // 他のユーザーの組織も作成
      await repo.create(testOtherUserId, {
        organizationName: "他の農園",
      });
    });

    it("ユーザーの組織一覧を取得できる", async () => {
      // Act
      const result = await repo.listByUser(testUserId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]?.name).toBe("第1農園");
      expect(result[1]?.name).toBe("第2農園");
      expect(result.every((org) => org.role === "admin")).toBe(true);
    });

    it("存在しないユーザーでも空配列を返す", async () => {
      // Act
      const result = await repo.listByUser("user_nonexistent");

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe("findById", () => {
    let testOrganizationId: string;

    beforeEach(async () => {
      const org = await repo.create(testUserId, {
        organizationName: "詳細テスト農園",
        description: "詳細取得テスト用",
      });
      testOrganizationId = org.organization.id;
    });

    it("組織の詳細を取得できる", async () => {
      // Act
      const result = await repo.findById(testOrganizationId);

      // Assert
      expect(result).toBeDefined();
      expect(result?.id).toBe(testOrganizationId);
      expect(result?.name).toBe("詳細テスト農園");
      expect(result?.description).toBe("詳細取得テスト用");
      expect(result?.role).toBe("admin");
      expect(result?.joinedAt).toBeInstanceOf(Date);
    });

    it("存在しない組織IDでnullを返す", async () => {
      // Act & Assert
      const result = await repo.findById("org_nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("update", () => {
    let testOrganizationId: string;

    beforeEach(async () => {
      const org = await repo.create(testUserId, {
        organizationName: "更新前農園",
        description: "更新前の説明",
      });
      testOrganizationId = org.organization.id;
    });

    it("組織の情報を更新できる", async () => {
      // Arrange
      const input: UpdateOrganizationInput = {
        name: "更新後農園",
        description: "更新後の説明",
      };

      // Act
      const result = await repo.update(testOrganizationId, input);

      // Assert
      expect(result.name).toBe("更新後農園");
      expect(result.description).toBe("更新後の説明");
      expect(result.id).toBe(testOrganizationId);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it("部分的な更新ができる", async () => {
      // Arrange
      const input: UpdateOrganizationInput = {
        name: "部分更新農園",
      };

      // Act
      const result = await repo.update(testOrganizationId, input);

      // Assert
      expect(result.name).toBe("部分更新農園");
      expect(result.description).toBe("更新前の説明"); // 変更されていない
    });

    it("説明を空文字にリセットできる", async () => {
      // Arrange
      const input: UpdateOrganizationInput = {
        name: "更新前農園", // 同じ名前
        description: "",
      };

      // Act
      const result = await repo.update(testOrganizationId, input);

      // Assert
      expect(result.name).toBe("更新前農園");
      expect(result.description).toBe("");
    });

    it("存在しない組織IDでエラーを投げる", () => {
      // Arrange
      const input: UpdateOrganizationInput = {
        name: "存在しない農園",
      };

      // Act & Assert
      expect(repo.update("org_nonexistent", input)).rejects.toThrow(
        DashboardDBError
      );
    });
  });

  describe("delete", () => {
    let testOrganizationId: string;

    beforeEach(async () => {
      const org = await repo.create(testUserId, {
        organizationName: "削除対象農園",
        description: "削除される農園",
      });
      testOrganizationId = org.organization.id;
    });

    it("組織を削除できる", async () => {
      // Act
      const result = await repo.delete(testOrganizationId);

      // Assert
      expect(result).toBe(true);

      // 削除されていることを確認
      const deletedOrg = await repo.findById(testOrganizationId);
      expect(deletedOrg).toBeNull();
    });

    it("存在しない組織でfalseを返す", async () => {
      // Act & Assert
      const result = await repo.delete("org_nonexistent");
      expect(result).toBe(false);
    });

    it("組織削除時に関連するメンバーシップも削除される", async () => {
      // 削除前の状態確認
      const membershipsBeforeDelete = await db
        .select()
        .from(organizationMembersTable);
      expect(membershipsBeforeDelete.length).toBeGreaterThan(0);

      // Act
      await repo.delete(testOrganizationId);

      // Assert - 関連するメンバーシップが削除されていることを確認
      const membershipsAfterDelete = await db
        .select()
        .from(organizationMembersTable)
        .where(eq(organizationMembersTable.organizationId, testOrganizationId));
      expect(membershipsAfterDelete).toHaveLength(0);
    });
  });

  describe("checkMembership", () => {
    let testOrganizationId: string;

    beforeEach(async () => {
      const org = await repo.create(testUserId, {
        organizationName: "メンバーシップテスト農園",
        description: "メンバーシップテスト用",
      });
      testOrganizationId = org.organization.id;
    });

    it("メンバーでロール指定なしの場合、エラーを投げない", async () => {
      // Act & Assert
      await expect(
        repo.checkMembership({
          userId: testUserId,
          organizationId: testOrganizationId,
        })
      ).resolves.not.toThrow();
    });

    it("メンバーで正しいロールを持っている場合、エラーを投げない", async () => {
      // Act & Assert
      await expect(
        repo.checkMembership(
          {
            userId: testUserId,
            organizationId: testOrganizationId,
          },
          "admin"
        )
      ).resolves.not.toThrow();
    });

    it("メンバーでないユーザーの場合、エラーを投げる", async () => {
      // Act & Assert
      await expect(
        repo.checkMembership({
          userId: testOtherUserId,
          organizationId: testOrganizationId,
        })
      ).rejects.toThrow(DashboardDBError);

      await expect(
        repo.checkMembership({
          userId: testOtherUserId,
          organizationId: testOrganizationId,
        })
      ).rejects.toThrow("no permission to access this organization");
    });

    it("メンバーだが必要なロールを持っていない場合、エラーを投げる", async () => {
      // Arrange - 別のユーザーをメンバーとして追加（デフォルトロール）
      await db.insert(organizationMembersTable).values({
        id: "test-member-id",
        userId: testOtherUserId,
        organizationId: testOrganizationId,
        role: "member",
      });

      // Act & Assert
      await expect(
        repo.checkMembership(
          {
            userId: testOtherUserId,
            organizationId: testOrganizationId,
          },
          "admin"
        )
      ).rejects.toThrow(DashboardDBError);

      await expect(
        repo.checkMembership(
          {
            userId: testOtherUserId,
            organizationId: testOrganizationId,
          },
          "admin"
        )
      ).rejects.toThrow("admin permission is required");
    });

    it("存在しない組織の場合、エラーを投げる", async () => {
      // Act & Assert
      await expect(
        repo.checkMembership({
          userId: testUserId,
          organizationId: "org_nonexistent",
        })
      ).rejects.toThrow(DashboardDBError);

      await expect(
        repo.checkMembership({
          userId: testUserId,
          organizationId: "org_nonexistent",
        })
      ).rejects.toThrow("no permission to access this organization");
    });

    it("存在しないユーザーの場合、エラーを投げる", async () => {
      // Act & Assert
      await expect(
        repo.checkMembership({
          userId: "user_nonexistent",
          organizationId: testOrganizationId,
        })
      ).rejects.toThrow(DashboardDBError);

      await expect(
        repo.checkMembership({
          userId: "user_nonexistent",
          organizationId: testOrganizationId,
        })
      ).rejects.toThrow("no permission to access this organization");
    });
  });

  describe("findAllWithNotification", () => {
    it("should return organizations with daily notification enabled", async () => {
      // 2つの組織を作成
      const org1 = await repo.create(testUserId, {
        organizationName: "Organization 1",
      });
      const org2 = await repo.create(testUserId, {
        organizationName: "Organization 2",
      });

      // 日次通知が有効なDiscordチャンネルを作成
      const webhookToken1 = "webhook-token-1";
      const webhookToken2 = "webhook-token-2";
      const webhookToken4 = "webhook-token-4";

      await db.insert(discordChannelsTable).values([
        {
          id: "channel-1",
          organizationId: org1.organization.id,
          channelId: "discord-channel-1",
          name: "general",
          guildId: "guild-1",
          guildName: "Test Guild 1",
          webhookId: "webhook-1",
          webhookTokenEnc: await encrypt(webhookToken1, testEncryptionKey),
          notificationSettings: { daily: true, weekly: false, monthly: false },
        },
        {
          id: "channel-2",
          organizationId: org1.organization.id,
          channelId: "discord-channel-2",
          name: "notifications",
          guildId: "guild-1",
          guildName: "Test Guild 1",
          webhookId: "webhook-2",
          webhookTokenEnc: await encrypt(webhookToken2, testEncryptionKey),
          notificationSettings: { daily: true, weekly: true, monthly: false },
        },
        {
          id: "channel-3",
          organizationId: org2.organization.id,
          channelId: "discord-channel-3",
          name: "admin",
          guildId: "guild-2",
          guildName: "Test Guild 2",
          webhookId: "webhook-3",
          webhookTokenEnc: null, // webhook情報なし
          notificationSettings: { daily: false, weekly: true, monthly: false },
        },
        {
          id: "channel-4",
          organizationId: org2.organization.id,
          channelId: "discord-channel-4",
          name: "daily-reports",
          guildId: "guild-2",
          guildName: "Test Guild 2",
          webhookId: "webhook-4",
          webhookTokenEnc: await encrypt(webhookToken4, testEncryptionKey),
          notificationSettings: { daily: true, weekly: false, monthly: true },
        },
      ]);

      // 日次通知が有効な組織を取得
      const result = await repo.findAllWithNotification("daily");

      // 結果の検証
      expect(result).toHaveLength(2);

      // Organization 1の検証
      const resultOrg1 = result.find(
        (org) => org.organizationName === "Organization 1"
      );
      expect(resultOrg1).toBeDefined();
      expect(resultOrg1?.channels).toHaveLength(2);
      expect(resultOrg1?.channels.map((ch) => ch.channelName)).toEqual(
        expect.arrayContaining(["general", "notifications"])
      );

      // webhook情報の検証
      const generalChannel = resultOrg1?.channels.find(
        (ch) => ch.channelName === "general"
      );
      expect(generalChannel?.webhookId).toBe("webhook-1");
      expect(generalChannel?.webhookToken).toBe(webhookToken1);

      const notificationsChannel = resultOrg1?.channels.find(
        (ch) => ch.channelName === "notifications"
      );
      expect(notificationsChannel?.webhookId).toBe("webhook-2");
      expect(notificationsChannel?.webhookToken).toBe(webhookToken2);

      // Organization 2の検証
      const resultOrg2 = result.find(
        (org) => org.organizationName === "Organization 2"
      );
      expect(resultOrg2).toBeDefined();
      expect(resultOrg2?.channels).toHaveLength(1);
      expect(resultOrg2?.channels[0]?.channelName).toBe("daily-reports");
      expect(resultOrg2?.channels[0]?.webhookId).toBe("webhook-4");
      expect(resultOrg2?.channels[0]?.webhookToken).toBe(webhookToken4);
    });

    it("should return organizations with weekly notification enabled", async () => {
      // 組織を作成
      const org1 = await repo.create(testUserId, {
        organizationName: "Weekly Org",
      });

      // 週次通知が有効なDiscordチャンネルを作成
      const weeklyWebhookToken = "weekly-webhook-token";

      await db.insert(discordChannelsTable).values([
        {
          id: "weekly-channel-1",
          organizationId: org1.organization.id,
          channelId: "discord-weekly-1",
          name: "weekly-reports",
          guildId: "guild-weekly",
          guildName: "Weekly Guild",
          webhookId: "weekly-webhook-1",
          webhookTokenEnc: await encrypt(weeklyWebhookToken, testEncryptionKey),
          notificationSettings: { daily: false, weekly: true, monthly: false },
        },
        {
          id: "weekly-channel-2",
          organizationId: org1.organization.id,
          channelId: "discord-weekly-2",
          name: "no-weekly",
          guildId: "guild-weekly",
          guildName: "Weekly Guild",
          webhookId: "no-weekly-webhook",
          webhookTokenEnc: await encrypt("no-weekly-token", testEncryptionKey),
          notificationSettings: { daily: true, weekly: false, monthly: false },
        },
      ]);

      // 週次通知が有効な組織を取得
      const result = await repo.findAllWithNotification("weekly");

      // 結果の検証
      expect(result).toHaveLength(1);
      expect(result[0]?.organizationName).toBe("Weekly Org");
      expect(result[0]?.channels).toHaveLength(1);
      expect(result[0]?.channels[0]?.channelName).toBe("weekly-reports");
      expect(result[0]?.channels[0]?.webhookId).toBe("weekly-webhook-1");
      expect(result[0]?.channels[0]?.webhookToken).toBe(weeklyWebhookToken);
    });

    it("should return empty array when no organizations have specified notification enabled", async () => {
      // 組織を作成
      const org1 = await repo.create(testUserId, {
        organizationName: "No Monthly Org",
      });

      // 月次通知が無効なDiscordチャンネルを作成
      await db.insert(discordChannelsTable).values({
        id: "no-monthly-channel",
        organizationId: org1.organization.id,
        channelId: "discord-no-monthly",
        name: "general",
        guildId: "guild-no-monthly",
        guildName: "No Monthly Guild",
        webhookId: "no-monthly-webhook",
        webhookTokenEnc: await encrypt("no-monthly-token", testEncryptionKey),
        notificationSettings: { daily: true, weekly: true, monthly: false },
      });

      // 月次通知が有効な組織を取得
      const result = await repo.findAllWithNotification("monthly");

      // 結果の検証
      expect(result).toHaveLength(0);
    });

    it("should return empty array when no discord channels exist", async () => {
      // 組織を作成（Discordチャンネルなし）
      await repo.create(testUserId, {
        organizationName: "No Discord Org",
      });

      // 日次通知が有効な組織を取得
      const result = await repo.findAllWithNotification("daily");

      // 結果の検証
      expect(result).toHaveLength(0);
    });

    it("should group multiple channels by organization correctly", async () => {
      // 組織を作成
      const org = await repo.create(testUserId, {
        organizationName: "Multi Channel Org",
      });

      // 同じ組織に複数のチャンネルを作成
      const tokenA = "token-a";
      const tokenB = "token-b";
      const tokenC = "token-c";

      await db.insert(discordChannelsTable).values([
        {
          id: "multi-channel-1",
          organizationId: org.organization.id,
          channelId: "discord-multi-1",
          name: "channel-a",
          guildId: "guild-multi",
          guildName: "Multi Guild",
          webhookId: "webhook-a",
          webhookTokenEnc: await encrypt(tokenA, testEncryptionKey),
          notificationSettings: { daily: true, weekly: false, monthly: false },
        },
        {
          id: "multi-channel-2",
          organizationId: org.organization.id,
          channelId: "discord-multi-2",
          name: "channel-b",
          guildId: "guild-multi",
          guildName: "Multi Guild",
          webhookId: "webhook-b",
          webhookTokenEnc: await encrypt(tokenB, testEncryptionKey),
          notificationSettings: { daily: true, weekly: true, monthly: false },
        },
        {
          id: "multi-channel-3",
          organizationId: org.organization.id,
          channelId: "discord-multi-3",
          name: "channel-c",
          guildId: "guild-multi",
          guildName: "Multi Guild",
          webhookId: "webhook-c",
          webhookTokenEnc: await encrypt(tokenC, testEncryptionKey),
          notificationSettings: { daily: true, weekly: false, monthly: true },
        },
      ]);

      // 日次通知が有効な組織を取得
      const result = await repo.findAllWithNotification("daily");

      // 結果の検証
      expect(result).toHaveLength(1);
      expect(result[0]?.organizationName).toBe("Multi Channel Org");
      expect(result[0]?.channels).toHaveLength(3);

      const channelNames = result[0]?.channels
        .map((ch) => ch.channelName)
        .sort();
      expect(channelNames).toEqual(["channel-a", "channel-b", "channel-c"]);

      // 各チャンネルの通知設定も正しく含まれていることを確認
      const channelA = result[0]?.channels.find(
        (ch) => ch.channelName === "channel-a"
      );
      expect(channelA?.notificationSettings.daily).toBe(true);
      expect(channelA?.notificationSettings.weekly).toBe(false);
      expect(channelA?.webhookId).toBe("webhook-a");
      expect(channelA?.webhookToken).toBe(tokenA);

      const channelB = result[0]?.channels.find(
        (ch) => ch.channelName === "channel-b"
      );
      expect(channelB?.webhookId).toBe("webhook-b");
      expect(channelB?.webhookToken).toBe(tokenB);

      const channelC = result[0]?.channels.find(
        (ch) => ch.channelName === "channel-c"
      );
      expect(channelC?.webhookId).toBe("webhook-c");
      expect(channelC?.webhookToken).toBe(tokenC);
    });

    it("should filter out channels without webhook information", async () => {
      // 組織を作成
      const org = await repo.create(testUserId, {
        organizationName: "Webhook Test Org",
      });

      // webhook情報がないチャンネルとあるチャンネルを作成
      await db.insert(discordChannelsTable).values([
        {
          id: "webhook-channel",
          organizationId: org.organization.id,
          channelId: "discord-webhook",
          name: "with-webhook",
          guildId: "guild-webhook",
          guildName: "Webhook Guild",
          webhookId: "webhook-valid",
          webhookTokenEnc: await encrypt("valid-token", testEncryptionKey),
          notificationSettings: { daily: true, weekly: false, monthly: false },
        },
        {
          id: "no-webhook-channel",
          organizationId: org.organization.id,
          channelId: "discord-no-webhook",
          name: "no-webhook",
          guildId: "guild-webhook",
          guildName: "Webhook Guild",
          webhookId: null, // webhook情報なし
          webhookTokenEnc: null,
          notificationSettings: { daily: true, weekly: false, monthly: false },
        },
      ]);

      // 日次通知が有効な組織を取得
      const result = await repo.findAllWithNotification("daily");

      // webhook情報があるチャンネルのみ含まれることを確認
      expect(result).toHaveLength(1);
      expect(result[0]?.organizationName).toBe("Webhook Test Org");
      expect(result[0]?.channels).toHaveLength(1);
      expect(result[0]?.channels[0]?.channelName).toBe("with-webhook");
      expect(result[0]?.channels[0]?.webhookId).toBe("webhook-valid");
      expect(result[0]?.channels[0]?.webhookToken).toBe("valid-token");
    });
  });
});
