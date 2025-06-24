import { describe, it, beforeEach, expect } from "vitest";
import { dbClient } from "@repo/db/client";
import {
  organizationMembersTable,
  organizationsTable,
  usersTable,
  discordChannelsTable,
} from "@repo/db/schema";
import {
  createOrganization,
  getUserOrganizations,
  getOrganizationById,
  updateOrganization,
  deleteOrganization,
  getOrganizationsWithNotification,
} from "./organization.service";

const db = dbClient();

describe("OrganizationService", () => {
  beforeEach(async () => {
    // テスト用のデータベースをリセット
    await db.transaction(async (tx) => {
      await tx.delete(discordChannelsTable);
      await tx.delete(organizationMembersTable);
      await tx.delete(organizationsTable);
      await tx.delete(usersTable);
    });
  });

  describe("createOrganization", () => {
    it("should create an organization and add user as admin", async () => {
      // テストユーザーを作成
      const testUserId = "test-user-id";
      await db.insert(usersTable).values({
        id: testUserId,
        name: "Test User",
      });

      const input = {
        organizationName: "Test Organization",
        description: "Test description",
      };

      // 組織を作成
      const result = await createOrganization(db, testUserId, input);

      // 結果の検証
      expect(result).toBeDefined();
      if (!result) throw new Error("Organization creation failed");
      expect(result?.organization).toBeDefined();
      expect(result.organization.name).toBe(input.organizationName);
      expect(result.organization.description).toBe(input.description);
      expect(result.membership).toBeDefined();
      expect(result.membership.userId).toBe(testUserId);
      expect(result.membership.role).toBe("admin");

      // データベースでの確認
      const organizations = await db.select().from(organizationsTable);
      expect(organizations).toHaveLength(1);
      expect(organizations[0]?.name).toBe(input.organizationName);

      const memberships = await db.select().from(organizationMembersTable);
      expect(memberships).toHaveLength(1);
      expect(memberships[0]?.userId).toBe(testUserId);
      expect(memberships[0]?.role).toBe("admin");
    });
  });

  describe("getUserOrganizations", () => {
    it("should return organizations for a user", async () => {
      // テストユーザーを作成
      const testUserId = "test-user-id";
      await db.insert(usersTable).values({
        id: testUserId,
        name: "Test User",
      });

      // 複数の組織を作成
      await createOrganization(db, testUserId, {
        organizationName: "Organization 1",
      });

      await createOrganization(db, testUserId, {
        organizationName: "Organization 2",
      });

      // ユーザーの組織一覧を取得
      const organizations = await getUserOrganizations(db, testUserId);

      // 結果の検証
      expect(organizations).toHaveLength(2);
      expect(
        organizations.find((org) => org.name === "Organization 1")
      ).toBeDefined();
      expect(
        organizations.find((org) => org.name === "Organization 2")
      ).toBeDefined();
      expect(organizations.every((org) => org.role === "admin")).toBe(true);
    });

    it("should return empty array for user with no organizations", async () => {
      const organizations = await getUserOrganizations(db, "non-existent-user");
      expect(organizations).toHaveLength(0);
    });
  });

  describe("getOrganizationById", () => {
    it("should return organization details for authorized user", async () => {
      // テストユーザーを作成
      const testUserId = "test-user-id";
      await db.insert(usersTable).values({
        id: testUserId,
        name: "Test User",
      });

      // 組織を作成
      const createdOrg = await createOrganization(db, testUserId, {
        organizationName: "Test Organization",
        description: "Test description",
      });
      if (!createdOrg) throw new Error("Organization creation failed");

      // 組織詳細を取得
      const organization = await getOrganizationById(
        db,
        createdOrg.organization.id,
        testUserId
      );

      // 結果の検証
      expect(organization).toBeDefined();
      expect(organization?.name).toBe("Test Organization");
      expect(organization?.description).toBe("Test description");
      expect(organization?.role).toBe("admin");
    });

    it("should return null for unauthorized user", async () => {
      // テストユーザーを作成
      const testUserId = "test-user-id";
      const otherUserId = "other-user-id";

      await db.insert(usersTable).values([
        { id: testUserId, name: "Test User" },
        { id: otherUserId, name: "Other User" },
      ]);

      // 組織を作成
      const createdOrg = await createOrganization(db, testUserId, {
        organizationName: "Test Organization",
      });
      if (!createdOrg) throw new Error("Organization creation failed");

      // 権限のないユーザーで組織詳細を取得
      const organization = await getOrganizationById(
        db,
        createdOrg.organization.id,
        otherUserId
      );

      // 結果の検証
      expect(organization).toBeNull();
    });

    it("should return null for non-existent organization", async () => {
      const organization = await getOrganizationById(
        db,
        "non-existent-org-id",
        "test-user-id"
      );

      expect(organization).toBeNull();
    });
  });

  describe("updateOrganization", () => {
    it("should update organization when user is admin", async () => {
      // テストユーザーを作成
      const testUserId = "test-user-id";
      await db.insert(usersTable).values({
        id: testUserId,
        name: "Test User",
      });

      // 組織を作成
      const createdOrg = await createOrganization(db, testUserId, {
        organizationName: "Original Organization",
        description: "Original description",
      });
      if (!createdOrg) throw new Error("Organization creation failed");

      const updateInput = {
        name: "Updated Organization",
        description: "Updated description",
      };

      // 組織を更新
      const updatedOrg = await updateOrganization(
        db,
        createdOrg.organization.id,
        testUserId,
        updateInput
      );

      // 結果の検証
      expect(updatedOrg).toBeDefined();
      if (!updatedOrg) throw new Error("Organization update failed");
      expect(updatedOrg.name).toBe(updateInput.name);
      expect(updatedOrg.description).toBe(updateInput.description);
      expect(updatedOrg.id).toBe(createdOrg.organization.id);

      // データベースでの確認
      const organizations = await db.select().from(organizationsTable);
      expect(organizations).toHaveLength(1);
      expect(organizations[0]?.name).toBe(updateInput.name);
      expect(organizations[0]?.description).toBe(updateInput.description);
    });
  });

  describe("deleteOrganization", () => {
    it("should delete an organization and all related memberships", async () => {
      // テストユーザーを作成
      const testUserId = "test-user-id";
      const testUserId2 = "test-user-id-2";

      await db.insert(usersTable).values([
        {
          id: testUserId,
          name: "Test User 1",
        },
        {
          id: testUserId2,
          name: "Test User 2",
        },
      ]);

      // 組織を作成
      const createdOrg = await createOrganization(db, testUserId, {
        organizationName: "Test Organization to Delete",
        description: "This organization will be deleted",
      });
      if (!createdOrg) throw new Error("Organization creation failed");

      // 追加メンバーを作成
      await db.insert(organizationMembersTable).values({
        id: "member-id-2",
        userId: testUserId2,
        organizationId: createdOrg.organization.id,
        role: "member",
      });

      // 削除前の状態確認
      const organizationsBeforeDelete = await db
        .select()
        .from(organizationsTable);
      const membershipsBeforeDelete = await db
        .select()
        .from(organizationMembersTable);
      expect(organizationsBeforeDelete).toHaveLength(1);
      expect(membershipsBeforeDelete).toHaveLength(2); // 管理者 + メンバー

      // 組織を削除
      const deleteResult = await deleteOrganization(
        db,
        createdOrg.organization.id
      );

      // 結果の検証
      expect(deleteResult).toBe(true);

      // データベースでの確認：組織が削除されている
      const organizationsAfterDelete = await db
        .select()
        .from(organizationsTable);
      expect(organizationsAfterDelete).toHaveLength(0);

      // データベースでの確認：関連するメンバーシップも削除されている
      const membershipsAfterDelete = await db
        .select()
        .from(organizationMembersTable);
      expect(membershipsAfterDelete).toHaveLength(0);
    });

    it("should return false when organization does not exist", async () => {
      const nonExistentOrgId = "non-existent-org-id";

      const deleteResult = await deleteOrganization(db, nonExistentOrgId);
      expect(deleteResult).toBe(false);
    });
  });

  describe("getOrganizationsWithNotification", () => {
    it("should return organizations with daily notification enabled", async () => {
      // テストユーザーを作成
      const testUserId = "test-user-id";
      await db.insert(usersTable).values({
        id: testUserId,
        name: "Test User",
      });

      // 2つの組織を作成
      const org1 = await createOrganization(db, testUserId, {
        organizationName: "Organization 1",
      });
      const org2 = await createOrganization(db, testUserId, {
        organizationName: "Organization 2",
      });

      if (!org1 || !org2) throw new Error("Organization creation failed");

      // 日次通知が有効なDiscordチャンネルを作成
      await db.insert(discordChannelsTable).values([
        {
          id: "channel-1",
          organizationId: org1.organization.id,
          channelId: "discord-channel-1",
          name: "general",
          guildId: "guild-1",
          guildName: "Test Guild 1",
          notificationSettings: { daily: true, weekly: false, monthly: false },
        },
        {
          id: "channel-2",
          organizationId: org1.organization.id,
          channelId: "discord-channel-2",
          name: "notifications",
          guildId: "guild-1",
          guildName: "Test Guild 1",
          notificationSettings: { daily: true, weekly: true, monthly: false },
        },
        {
          id: "channel-3",
          organizationId: org2.organization.id,
          channelId: "discord-channel-3",
          name: "admin",
          guildId: "guild-2",
          guildName: "Test Guild 2",
          notificationSettings: { daily: false, weekly: true, monthly: false },
        },
        {
          id: "channel-4",
          organizationId: org2.organization.id,
          channelId: "discord-channel-4",
          name: "daily-reports",
          guildId: "guild-2",
          guildName: "Test Guild 2",
          notificationSettings: { daily: true, weekly: false, monthly: true },
        },
      ]);

      // 日次通知が有効な組織を取得
      const result = await getOrganizationsWithNotification(db, "daily");

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

      // Organization 2の検証
      const resultOrg2 = result.find(
        (org) => org.organizationName === "Organization 2"
      );
      expect(resultOrg2).toBeDefined();
      expect(resultOrg2?.channels).toHaveLength(1);
      expect(resultOrg2?.channels[0]?.channelName).toBe("daily-reports");
    });

    it("should return organizations with weekly notification enabled", async () => {
      // テストユーザーを作成
      const testUserId = "test-user-id";
      await db.insert(usersTable).values({
        id: testUserId,
        name: "Test User",
      });

      // 組織を作成
      const org1 = await createOrganization(db, testUserId, {
        organizationName: "Weekly Org",
      });

      if (!org1) throw new Error("Organization creation failed");

      // 週次通知が有効なDiscordチャンネルを作成
      await db.insert(discordChannelsTable).values([
        {
          id: "weekly-channel-1",
          organizationId: org1.organization.id,
          channelId: "discord-weekly-1",
          name: "weekly-reports",
          guildId: "guild-weekly",
          guildName: "Weekly Guild",
          notificationSettings: { daily: false, weekly: true, monthly: false },
        },
        {
          id: "weekly-channel-2",
          organizationId: org1.organization.id,
          channelId: "discord-weekly-2",
          name: "no-weekly",
          guildId: "guild-weekly",
          guildName: "Weekly Guild",
          notificationSettings: { daily: true, weekly: false, monthly: false },
        },
      ]);

      // 週次通知が有効な組織を取得
      const result = await getOrganizationsWithNotification(db, "weekly");

      // 結果の検証
      expect(result).toHaveLength(1);
      expect(result[0]?.organizationName).toBe("Weekly Org");
      expect(result[0]?.channels).toHaveLength(1);
      expect(result[0]?.channels[0]?.channelName).toBe("weekly-reports");
    });

    it("should return empty array when no organizations have specified notification enabled", async () => {
      // テストユーザーを作成
      const testUserId = "test-user-id";
      await db.insert(usersTable).values({
        id: testUserId,
        name: "Test User",
      });

      // 組織を作成
      const org1 = await createOrganization(db, testUserId, {
        organizationName: "No Monthly Org",
      });

      if (!org1) throw new Error("Organization creation failed");

      // 月次通知が無効なDiscordチャンネルを作成
      await db.insert(discordChannelsTable).values({
        id: "no-monthly-channel",
        organizationId: org1.organization.id,
        channelId: "discord-no-monthly",
        name: "general",
        guildId: "guild-no-monthly",
        guildName: "No Monthly Guild",
        notificationSettings: { daily: true, weekly: true, monthly: false },
      });

      // 月次通知が有効な組織を取得
      const result = await getOrganizationsWithNotification(db, "monthly");

      // 結果の検証
      expect(result).toHaveLength(0);
    });

    it("should return empty array when no discord channels exist", async () => {
      // テストユーザーを作成
      const testUserId = "test-user-id";
      await db.insert(usersTable).values({
        id: testUserId,
        name: "Test User",
      });

      // 組織を作成（Discordチャンネルなし）
      await createOrganization(db, testUserId, {
        organizationName: "No Discord Org",
      });

      // 日次通知が有効な組織を取得
      const result = await getOrganizationsWithNotification(db, "daily");

      // 結果の検証
      expect(result).toHaveLength(0);
    });

    it("should group multiple channels by organization correctly", async () => {
      // テストユーザーを作成
      const testUserId = "test-user-id";
      await db.insert(usersTable).values({
        id: testUserId,
        name: "Test User",
      });

      // 組織を作成
      const org = await createOrganization(db, testUserId, {
        organizationName: "Multi Channel Org",
      });

      if (!org) throw new Error("Organization creation failed");

      // 同じ組織に複数のチャンネルを作成
      await db.insert(discordChannelsTable).values([
        {
          id: "multi-channel-1",
          organizationId: org.organization.id,
          channelId: "discord-multi-1",
          name: "channel-a",
          guildId: "guild-multi",
          guildName: "Multi Guild",
          notificationSettings: { daily: true, weekly: false, monthly: false },
        },
        {
          id: "multi-channel-2",
          organizationId: org.organization.id,
          channelId: "discord-multi-2",
          name: "channel-b",
          guildId: "guild-multi",
          guildName: "Multi Guild",
          notificationSettings: { daily: true, weekly: true, monthly: false },
        },
        {
          id: "multi-channel-3",
          organizationId: org.organization.id,
          channelId: "discord-multi-3",
          name: "channel-c",
          guildId: "guild-multi",
          guildName: "Multi Guild",
          notificationSettings: { daily: true, weekly: false, monthly: true },
        },
      ]);

      // 日次通知が有効な組織を取得
      const result = await getOrganizationsWithNotification(db, "daily");

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
    });
  });
});
