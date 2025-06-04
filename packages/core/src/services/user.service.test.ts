import { describe, it, beforeEach, expect } from "vitest";
import { dbClient } from "@repo/db/client";
import {
  organizationMembersTable,
  organizationsTable,
  usersTable,
} from "@repo/db/schema";
import { getUserById, setupUserAndOrganization } from "..";

const db = dbClient();

describe("UserService (関数型)", () => {
  beforeEach(async () => {
    // テスト用のデータベースをリセット
    await db.transaction(async (tx) => {
      await tx.delete(organizationMembersTable);
      await tx.delete(usersTable);
      await tx.delete(organizationsTable);
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
});
