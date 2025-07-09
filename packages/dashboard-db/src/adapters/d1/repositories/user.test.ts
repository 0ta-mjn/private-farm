import { describe, it, expect, beforeEach } from "vitest";
import {
  organizationsTable,
  organizationMembersTable,
  usersTable,
} from "../schema";
import { createTestDashboardD1Client } from "../testing";
import { D1UserRepo } from "./user";
import { SetupInput, UserProfileUpdateInput } from "../../../interfaces";
import { DashboardDBError } from "../../../errors";
import { eq, and } from "drizzle-orm";

const db = await createTestDashboardD1Client();
const repo = new D1UserRepo(db);

describe("D1UserRepo", () => {
  let testUserId: string;
  let testOtherUserId: string;

  beforeEach(async () => {
    // テスト用のデータベースをリセット
    await db.delete(organizationMembersTable);
    await db.delete(organizationsTable);
    await db.delete(usersTable);

    // テストデータをセットアップ
    testUserId = "test-user-id";
    testOtherUserId = "test-other-user-id";
  });

  describe("findById", () => {
    it("存在するユーザーを取得できる", async () => {
      // Arrange
      await db.insert(usersTable).values({
        id: testUserId,
        name: "Test User",
      });

      // Act
      const result = await repo.findById(testUserId);

      // Assert
      expect(result).toBeDefined();
      expect(result?.id).toBe(testUserId);
      expect(result?.name).toBe("Test User");
      expect(result?.createdAt).toBeInstanceOf(Date);
      expect(result?.updatedAt).toBeInstanceOf(Date);
    });

    it("存在しないユーザーの場合nullを返す", async () => {
      // Act
      const result = await repo.findById("non-existent-user-id");

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("setup", () => {
    it("新規ユーザーのセットアップが成功する", async () => {
      // Arrange
      const input: SetupInput = {
        userName: "New User",
        organizationName: "New Organization",
      };

      // Act
      const result = await repo.setup(testUserId, input);

      // Assert
      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.id).toBe(testUserId);
      expect(result.user.name).toBe("New User");
      expect(result.organization).toBeDefined();
      expect(result.organization.name).toBe("New Organization");
      expect(result.organization.id).toMatch(/^org_/);
      expect(result.membership).toBeDefined();
      expect(result.membership.userId).toBe(testUserId);
      expect(result.membership.organizationId).toBe(result.organization.id);
      expect(result.membership.role).toBe("admin");
    });

    it("既存ユーザーの場合でも成功する", async () => {
      // Arrange
      await db.insert(usersTable).values({
        id: testUserId,
        name: "Existing User",
      });

      const input: SetupInput = {
        userName: "Updated User",
        organizationName: "New Organization",
      };

      // Act
      const result = await repo.setup(testUserId, input);

      // Assert
      expect(result).toBeDefined();
      expect(result.user.id).toBe(testUserId);
      expect(result.user.name).toBe("Updated User");
      expect(result.organization).toBeDefined();
      expect(result.organization.name).toBe("New Organization");
      expect(result.membership).toBeDefined();
    });

    it("既存ユーザーの名前が更新される", async () => {
      // Arrange
      await db.insert(usersTable).values({
        id: testUserId,
        name: "Original Name",
      });

      const input: SetupInput = {
        userName: "Updated Name",
        organizationName: "Test Organization",
      };

      // Act
      const result = await repo.setup(testUserId, input);

      // Assert
      expect(result.user.name).toBe("Updated Name");

      // データベースからも確認
      const userFromDB = await repo.findById(testUserId);
      expect(userFromDB?.name).toBe("Updated Name");
    });
  });

  describe("checkSetupStatus", () => {
    it("ユーザーが存在しない場合、未完了状態を返す", async () => {
      // Act
      const result = await repo.checkSetupStatus("non-existent-user-id");

      // Assert
      expect(result.isCompleted).toBe(false);
      expect(result.hasUser).toBe(false);
      expect(result.hasOrganization).toBe(false);
      expect(result.user).toBeNull();
    });

    it("ユーザーは存在するが組織に所属していない場合、未完了状態を返す", async () => {
      // Arrange
      await db.insert(usersTable).values({
        id: testUserId,
        name: "Test User",
      });

      // Act
      const result = await repo.checkSetupStatus(testUserId);

      // Assert
      expect(result.isCompleted).toBe(false);
      expect(result.hasUser).toBe(true);
      expect(result.hasOrganization).toBe(false);
      expect(result.user?.id).toBe(testUserId);
      expect(result.user?.name).toBe("Test User");
    });

    it("ユーザーが組織に所属している場合、完了状態を返す", async () => {
      // Arrange
      await repo.setup(testUserId, {
        userName: "Test User",
        organizationName: "Test Organization",
      });

      // Act
      const result = await repo.checkSetupStatus(testUserId);

      // Assert
      expect(result.isCompleted).toBe(true);
      expect(result.hasUser).toBe(true);
      expect(result.hasOrganization).toBe(true);
      expect(result.user?.id).toBe(testUserId);
      expect(result.user?.name).toBe("Test User");
    });
  });

  describe("getSidebarData", () => {
    it("存在しないユーザーの場合はエラーを投げる", async () => {
      // Act & Assert
      await expect(repo.getSidebarData("non-existent-user")).rejects.toThrow(
        DashboardDBError
      );
    });

    it("ユーザーのサイドバーデータを正しく取得する", async () => {
      // Arrange
      const setupResult = await repo.setup(testUserId, {
        userName: "Test User",
        organizationName: "Test Organization",
      });

      // Act
      const result = await repo.getSidebarData(testUserId);

      // Assert
      expect(result).toBeDefined();
      expect(result.user.id).toBe(testUserId);
      expect(result.user.name).toBe("Test User");
      expect(result.organizations).toHaveLength(1);
      expect(result.organizations[0]?.name).toBe("Test Organization");
      expect(result.organizations[0]?.role).toBe("admin");
      expect(result.defaultOrganization).toBeDefined();
      expect(result.defaultOrganization?.id).toBe(setupResult.organization.id);
    });

    it("複数組織に所属している場合、latestViewedAtで順序が決まる", async () => {
      // Arrange
      // 最初の組織を作成
      await repo.setup(testUserId, {
        userName: "Test User",
        organizationName: "First Organization",
      });

      // 2番目の組織を作成
      const secondOrgId = "test-org-2";
      await db.insert(organizationsTable).values({
        id: secondOrgId,
        name: "Second Organization",
        description: "Second test organization",
      });

      // ユーザーを2番目の組織にも追加
      const membershipId = "test-membership-2";
      await db.insert(organizationMembersTable).values({
        id: membershipId,
        userId: testUserId,
        organizationId: secondOrgId,
        role: "member",
      });

      // 最初に順序を確認（latestViewedAtが未設定の状態）
      const initialSidebarData = await repo.getSidebarData(testUserId);
      expect(initialSidebarData.organizations).toHaveLength(2);

      // 2番目の組織の latestViewedAt を更新
      const updateResult = await repo.updateOrganizationLatestViewedAt(
        testUserId,
        secondOrgId
      );
      expect(updateResult).toBe(true);

      // Act
      const result = await repo.getSidebarData(testUserId);

      // Assert
      expect(result.organizations).toHaveLength(2);
      // latestViewedAt が設定された組織が最初に来ることを確認
      expect(result.organizations[0]?.name).toBe("Second Organization");
      expect(result.defaultOrganization?.name).toBe("Second Organization");
    });
  });

  describe("updateProfile", () => {
    it("ユーザープロフィールが正しく更新される", async () => {
      // Arrange
      const originalName = "Original User";
      const updatedName = "Updated User";

      await db.insert(usersTable).values({
        id: testUserId,
        name: originalName,
      });

      const input: UserProfileUpdateInput = {
        name: updatedName,
      };

      // Act
      const result = await repo.updateProfile(testUserId, input);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(testUserId);
      expect(result.name).toBe(updatedName);
      expect(result.updatedAt).toBeDefined();

      // データベースからも確認
      const userFromDB = await repo.findById(testUserId);
      expect(userFromDB?.name).toBe(updatedName);
    });

    it("存在しないユーザーの場合はエラーを投げる", async () => {
      // Arrange
      const input: UserProfileUpdateInput = {
        name: "New Name",
      };

      // Act & Assert
      await expect(
        repo.updateProfile("non-existent-user", input)
      ).rejects.toThrow(DashboardDBError);
    });

    it("名前が空文字列でも更新される", async () => {
      // Arrange
      await db.insert(usersTable).values({
        id: testUserId,
        name: "Original Name",
      });

      const input: UserProfileUpdateInput = {
        name: "",
      };

      // Act
      const result = await repo.updateProfile(testUserId, input);

      // Assert
      expect(result).toBeDefined();
      expect(result.name).toBe("");
    });

    it("updatedAtが正しく更新される", async () => {
      // Arrange
      await db.insert(usersTable).values({
        id: testUserId,
        name: "Original Name",
        updatedAt: new Date("2023-01-01T00:00:00Z"),
      });

      // 元のupdatedAtを取得
      const originalUser = await repo.findById(testUserId);
      const originalUpdatedAt = originalUser?.updatedAt;

      // 少し待機してからプロフィールを更新
      await new Promise((resolve) => setTimeout(resolve, 10));

      const input: UserProfileUpdateInput = {
        name: "Updated Name",
      };

      // Act
      const result = await repo.updateProfile(testUserId, input);

      // Assert
      expect(result).toBeDefined();
      expect(result.updatedAt).toBeDefined();

      // updatedAtが更新されていることを確認
      if (originalUpdatedAt && result.updatedAt) {
        expect(result.updatedAt.getTime()).toBeGreaterThan(
          originalUpdatedAt.getTime()
        );
      }
    });
  });

  describe("updateOrganizationLatestViewedAt", () => {
    it("組織の最終閲覧時刻が正しく更新される", async () => {
      // Arrange
      const setupResult = await repo.setup(testUserId, {
        userName: "Test User",
        organizationName: "Test Organization",
      });

      const organizationId = setupResult.organization.id;

      // Act
      const result = await repo.updateOrganizationLatestViewedAt(
        testUserId,
        organizationId
      );

      // Assert
      expect(result).toBe(true);

      // latestViewedAt が更新されたことを直接データベースから確認
      const membershipResult = await db
        .select({
          latestViewedAt: organizationMembersTable.latestViewedAt,
        })
        .from(organizationMembersTable)
        .where(
          and(
            eq(organizationMembersTable.userId, testUserId),
            eq(organizationMembersTable.organizationId, organizationId)
          )
        )
        .limit(1);

      expect(membershipResult[0]?.latestViewedAt).not.toBeNull();

      // latestViewedAt が現在時刻に近い値に更新されていることを確認
      const now = new Date();
      const latestViewedAt = membershipResult[0]?.latestViewedAt;
      if (latestViewedAt) {
        const timeDiff = Math.abs(now.getTime() - latestViewedAt.getTime());
        expect(timeDiff).toBeLessThan(5000); // 5秒以内
      }
    });

    it("存在しないユーザーの場合はfalseを返す", async () => {
      // Act
      const result = await repo.updateOrganizationLatestViewedAt(
        "non-existent-user",
        "some-organization-id"
      );

      // Assert
      expect(result).toBe(false);
    });

    it("存在しない組織の場合はfalseを返す", async () => {
      // Arrange
      await db.insert(usersTable).values({
        id: testUserId,
        name: "Test User",
      });

      // Act
      const result = await repo.updateOrganizationLatestViewedAt(
        testUserId,
        "non-existent-organization"
      );

      // Assert
      expect(result).toBe(false);
    });

    it("ユーザーが組織のメンバーでない場合はfalseを返す", async () => {
      // Arrange
      await repo.setup("user-1", {
        userName: "User 1",
        organizationName: "Organization 1",
      });

      const setupResult2 = await repo.setup("user-2", {
        userName: "User 2",
        organizationName: "Organization 2",
      });

      // Act - user-1 が organization-2 の latestViewedAt を更新しようとする（権限なし）
      const result = await repo.updateOrganizationLatestViewedAt(
        "user-1",
        setupResult2.organization.id
      );

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("delete", () => {
    it("存在しないユーザーの削除はfalseを返す", async () => {
      // Act
      const result = await repo.delete("non-existent-user-id");

      // Assert
      expect(result).toBe(false);
    });

    it("単独でユーザーを削除できる", async () => {
      // Arrange
      await db.insert(usersTable).values({
        id: testUserId,
        name: "Test User",
      });

      // Act
      const result = await repo.delete(testUserId);

      // Assert
      expect(result).toBe(true);

      // ユーザーが削除されていることを確認
      const deletedUser = await repo.findById(testUserId);
      expect(deletedUser).toBeNull();
    });

    it("ユーザーが唯一のメンバーである組織を削除する", async () => {
      // Arrange
      const setupResult = await repo.setup(testUserId, {
        userName: "Test User",
        organizationName: "Test Organization",
      });

      // 削除前に組織が存在することを確認
      const orgBefore = await db
        .select()
        .from(organizationsTable)
        .where(eq(organizationsTable.id, setupResult.organization.id))
        .limit(1);
      expect(orgBefore).toHaveLength(1);

      // メンバーシップが存在することを確認
      const membershipBefore = await db
        .select()
        .from(organizationMembersTable)
        .where(eq(organizationMembersTable.userId, testUserId))
        .limit(1);
      expect(membershipBefore).toHaveLength(1);

      // Act
      const result = await repo.delete(testUserId);

      // Assert
      expect(result).toBe(true);

      // ユーザーが削除されていることを確認
      const deletedUser = await repo.findById(testUserId);
      expect(deletedUser).toBeNull();

      // 組織も削除されていることを確認
      const orgAfter = await db
        .select()
        .from(organizationsTable)
        .where(eq(organizationsTable.id, setupResult.organization.id))
        .limit(1);
      expect(orgAfter).toHaveLength(0);

      // メンバーシップも削除されていることを確認
      const membershipAfter = await db
        .select()
        .from(organizationMembersTable)
        .where(eq(organizationMembersTable.userId, testUserId))
        .limit(1);
      expect(membershipAfter).toHaveLength(0);
    });

    it("複数メンバーがいる組織は削除しない", async () => {
      // Arrange
      const setupResult = await repo.setup(testUserId, {
        userName: "Test User 1",
        organizationName: "Shared Organization",
      });

      // 2人目のユーザーを作成
      await db.insert(usersTable).values({
        id: testOtherUserId,
        name: "Test User 2",
      });

      // 2人目のユーザーを同じ組織に追加
      await db.insert(organizationMembersTable).values({
        id: "member-2",
        userId: testOtherUserId,
        organizationId: setupResult.organization.id,
        role: "member",
      });

      // Act
      const result = await repo.delete(testUserId);

      // Assert
      expect(result).toBe(true);

      // 1人目のユーザーが削除されていることを確認
      const deletedUser = await repo.findById(testUserId);
      expect(deletedUser).toBeNull();

      // 組織は削除されていないことを確認（2人目がまだいるため）
      const orgAfter = await db
        .select()
        .from(organizationsTable)
        .where(eq(organizationsTable.id, setupResult.organization.id))
        .limit(1);
      expect(orgAfter).toHaveLength(1);

      // 2人目のユーザーのメンバーシップは残っていることを確認
      const membershipAfter = await db
        .select()
        .from(organizationMembersTable)
        .where(eq(organizationMembersTable.userId, testOtherUserId))
        .limit(1);
      expect(membershipAfter).toHaveLength(1);
    });

    it("複数の唯一メンバー組織を持つユーザーの削除", async () => {
      // Arrange
      await db.insert(usersTable).values({
        id: testUserId,
        name: "Test User",
      });

      // 2つの組織を作成してユーザーを唯一のメンバーにする
      await db.insert(organizationsTable).values({
        id: "org-1",
        name: "Organization 1",
      });

      await db.insert(organizationsTable).values({
        id: "org-2",
        name: "Organization 2",
      });

      // メンバーシップを作成
      await db.insert(organizationMembersTable).values([
        {
          id: "member-org1",
          userId: testUserId,
          organizationId: "org-1",
          role: "admin",
        },
        {
          id: "member-org2",
          userId: testUserId,
          organizationId: "org-2",
          role: "admin",
        },
      ]);

      // Act
      const result = await repo.delete(testUserId);

      // Assert
      expect(result).toBe(true);

      // ユーザーが削除されていることを確認
      const deletedUser = await repo.findById(testUserId);
      expect(deletedUser).toBeNull();

      // 両方の組織が削除されていることを確認
      const orgsAfter = await db
        .select()
        .from(organizationsTable)
        .where(eq(organizationsTable.id, "org-1"));
      expect(orgsAfter).toHaveLength(0);

      const orgsAfter2 = await db
        .select()
        .from(organizationsTable)
        .where(eq(organizationsTable.id, "org-2"));
      expect(orgsAfter2).toHaveLength(0);

      // すべてのメンバーシップが削除されていることを確認
      const membershipsAfter = await db
        .select()
        .from(organizationMembersTable)
        .where(eq(organizationMembersTable.userId, testUserId));
      expect(membershipsAfter).toHaveLength(0);
    });
  });
});
