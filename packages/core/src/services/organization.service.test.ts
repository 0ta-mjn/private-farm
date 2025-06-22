import { describe, it, beforeEach, expect } from "vitest";
import { dbClient } from "@repo/db/client";
import {
  organizationMembersTable,
  organizationsTable,
  usersTable,
} from "@repo/db/schema";
import {
  createOrganization,
  getUserOrganizations,
  getOrganizationById,
  updateOrganization,
  deleteOrganization,
} from "./organization.service";

const db = dbClient();

describe("OrganizationService", () => {
  beforeEach(async () => {
    // テスト用のデータベースをリセット
    await db.transaction(async (tx) => {
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
});
