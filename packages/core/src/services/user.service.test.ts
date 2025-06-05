import { describe, it, beforeEach, expect, beforeAll } from "vitest";
import { dbClient } from "@repo/db/client";
import {
  organizationMembersTable,
  organizationsTable,
  usersTable,
} from "@repo/db/schema";
import {
  getUserById,
  setupUserAndOrganization,
  checkUserSetupStatus,
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
});
