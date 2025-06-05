import { describe, it, beforeEach, expect, beforeAll } from "vitest";
import { dbClient } from "@repo/db/client";
import { eq, and } from "@repo/db";
import {
  organizationMembersTable,
  organizationsTable,
  usersTable,
} from "@repo/db/schema";
import {
  getUserById,
  setupUserAndOrganization,
  checkUserSetupStatus,
  getUserSidebarData,
  updateOrganizationLatestViewedAt,
} from "..";

const db = dbClient();

describe("UserService (関数型)", () => {
  beforeEach(async () => {
    // テスト用のデータベースをリセット
    await db.transaction(async (tx) => {
      await tx.delete(organizationMembersTable);
      await tx.delete(organizationsTable);
      await tx.delete(usersTable);
    });
  });

  describe("getUserById", () => {
    it("存在するユーザーを取得できる", async () => {
      const testUserId = "test-user-id";
      // テスト用のユーザーを作成
      await db
        .insert(usersTable)
        .values({
          id: testUserId,
          name: "Test User",
        })
        .returning();

      const res = await getUserById(db, testUserId);
      expect(res).toBeDefined();
    });

    it("存在しないユーザーの場合nullを返す", async () => {
      const res = await getUserById(db, "non-existent-user-id");
      expect(res).toBeNull();
    });
  });

  describe("setupUserAndOrganization", () => {
    it("新規ユーザーのセットアップが成功する", async () => {
      const res = await setupUserAndOrganization(db, "new-user-id", {
        userName: "New User",
        organizationName: "New Organization",
      });
      expect(res).toBeDefined();
      expect(res.user).toBeDefined();
      expect(res.user.id).toBe("new-user-id");
      expect(res.organization).toBeDefined();
      expect(res.organization.name).toBe("New Organization");
      expect(res.membership).toBeDefined();
    });

    it("既存ユーザーの場合でも成功", async () => {
      const existingUserId = "existing-user-id";
      // 既存ユーザーを作成
      await db
        .insert(usersTable)
        .values({
          id: existingUserId,
          name: "Existing User",
        })
        .returning();

      const res = await setupUserAndOrganization(db, existingUserId, {
        userName: "Edited User",
        organizationName: "New Organization",
      });
      expect(res).toBeDefined();
      expect(res.user.id).toBe("existing-user-id");
      expect(res.user.name).toBe("Edited User");
      expect(res.organization).toBeDefined();
      expect(res.organization.name).toBe("New Organization");
    });
  });

  describe("checkUserSetupStatus", () => {
    it("ユーザーが存在しない場合、未完了状態を返す", async () => {
      const result = await checkUserSetupStatus(db, "non-existent-user-id");

      expect(result.isCompleted).toBe(false);
      expect(result.hasUser).toBe(false);
      expect(result.hasOrganization).toBe(false);
    });

    it("ユーザーは存在するが組織に所属していない場合、未完了状態を返す", async () => {
      const testUserId = "test-user-id";
      // テスト用のユーザーを作成
      await db
        .insert(usersTable)
        .values({
          id: testUserId,
          name: "Test User",
        })
        .returning();

      const result = await checkUserSetupStatus(db, testUserId);

      expect(result.isCompleted).toBe(false);
      expect(result.hasUser).toBe(true);
      expect(result.hasOrganization).toBe(false);
    });

    it("ユーザーが組織に所属している場合、完了状態を返す", async () => {
      const testUserId = "test-user-with-org";

      // setupUserAndOrganizationでユーザーと組織を作成
      const setupResult = await setupUserAndOrganization(db, testUserId, {
        userName: "Test User",
        organizationName: "Test Organization",
      });

      const result = await checkUserSetupStatus(db, testUserId);

      expect(result.isCompleted).toBe(true);
      expect(result.hasUser).toBe(true);
      expect(result.hasOrganization).toBe(true);
    });
  });

  describe("updateOrganizationLatestViewedAt", () => {
    it("組織の最終閲覧時刻が正しく更新される", async () => {
      const testUserId = "test-user-id";

      // ユーザーと組織をセットアップ
      const setupResult = await setupUserAndOrganization(db, testUserId, {
        userName: "Test User",
        organizationName: "Test Organization",
      });

      const organizationId = setupResult.organization.id;

      // updateOrganizationLatestViewedAt を実行
      const result = await updateOrganizationLatestViewedAt(
        db,
        testUserId,
        organizationId
      );
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
      const result = await updateOrganizationLatestViewedAt(
        db,
        "non-existent-user",
        "some-organization-id"
      );
      expect(result).toBe(false);
    });

    it("存在しない組織の場合はfalseを返す", async () => {
      const testUserId = "test-user-id";

      // ユーザーのみ作成
      await db.insert(usersTable).values({
        id: testUserId,
        name: "Test User",
      });

      const result = await updateOrganizationLatestViewedAt(
        db,
        testUserId,
        "non-existent-organization"
      );
      expect(result).toBe(false);
    });

    it("ユーザーが組織のメンバーでない場合はfalseを返す", async () => {
      const userId1 = "user-1";
      const userId2 = "user-2";

      // 2つのユーザーと組織を作成
      const setupResult1 = await setupUserAndOrganization(db, userId1, {
        userName: "User 1",
        organizationName: "Organization 1",
      });

      const setupResult2 = await setupUserAndOrganization(db, userId2, {
        userName: "User 2",
        organizationName: "Organization 2",
      });

      // user-1 が organization-2 の latestViewedAt を更新しようとする（権限なし）
      const result = await updateOrganizationLatestViewedAt(
        db,
        userId1,
        setupResult2.organization.id
      );
      expect(result).toBe(false);
    });
  });

  describe("getUserSidebarData", () => {
    it("ユーザーのサイドバーデータを正しく取得する", async () => {
      const testUserId = "test-user-id";

      // ユーザーと組織をセットアップ
      const setupResult = await setupUserAndOrganization(db, testUserId, {
        userName: "Test User",
        organizationName: "Test Organization",
      });

      const sidebarData = await getUserSidebarData(db, testUserId);

      expect(sidebarData).toBeDefined();
      expect(sidebarData?.user.id).toBe(testUserId);
      expect(sidebarData?.user.name).toBe("Test User");
      expect(sidebarData?.organizations).toHaveLength(1);
      expect(sidebarData?.organizations[0]?.name).toBe("Test Organization");
      expect(sidebarData?.organizations[0]?.role).toBe("admin");
      expect(sidebarData?.defaultOrganization).toBeDefined();
      expect(sidebarData?.defaultOrganization?.id).toBe(
        setupResult.organization.id
      );
    });

    it("存在しないユーザーの場合はnullを返す", async () => {
      const sidebarData = await getUserSidebarData(db, "non-existent-user");
      expect(sidebarData).toBeNull();
    });

    it("複数組織に所属している場合、latestViewedAtで順序が決まる", async () => {
      const testUserId = "test-user-id";

      // 最初の組織を作成
      const setupResult1 = await setupUserAndOrganization(db, testUserId, {
        userName: "Test User",
        organizationName: "First Organization",
      });

      // 2番目の組織を作成
      const secondOrgId = "test-org-2";
      const org2Result = await db
        .insert(organizationsTable)
        .values({
          id: secondOrgId,
          name: "Second Organization",
          description: "Second test organization",
        })
        .returning();

      // ユーザーを2番目の組織にも追加
      const membershipId = "test-membership-2";
      await db.insert(organizationMembersTable).values({
        id: membershipId,
        userId: testUserId,
        organizationId: secondOrgId,
        role: "member",
      });

      // 最初に順序を確認（latestViewedAtが未設定の状態）
      const initialSidebarData = await getUserSidebarData(db, testUserId);
      expect(initialSidebarData?.organizations).toHaveLength(2);

      // 2番目の組織の latestViewedAt を更新
      const updateResult = await updateOrganizationLatestViewedAt(
        db,
        testUserId,
        secondOrgId
      );
      expect(updateResult).toBe(true);

      const sidebarData = await getUserSidebarData(db, testUserId);

      expect(sidebarData?.organizations).toHaveLength(2);
      // latestViewedAt が設定された組織が最初に来ることを確認
      expect(sidebarData?.organizations[0]?.name).toBe("Second Organization");
      expect(sidebarData?.defaultOrganization?.name).toBe(
        "Second Organization"
      );
    });
  });
});
