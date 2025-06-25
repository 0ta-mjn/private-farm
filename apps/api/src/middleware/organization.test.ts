import { describe, it, beforeEach, expect } from "vitest";
import { dbClient } from "@repo/db/client";
import {
  organizationMembersTable,
  organizationsTable,
  usersTable,
} from "@repo/db/schema";
import { guardOrganizationMembership } from "./organization";

const db = dbClient();

describe("organizationGuard", () => {
  beforeEach(async () => {
    // テスト用のデータベースをリセット
    await db.transaction(async (tx) => {
      await tx.delete(organizationMembersTable);
      await tx.delete(organizationsTable);
      await tx.delete(usersTable);
    });
  });

  describe("guardOrganizationMembership", () => {
    it("should throw error if user is not a member of the organization", async () => {
      const userId = "test-user-id";
      const organizationId = "test-organization-id";
      await db.insert(usersTable).values({ id: userId, name: "Test User" });
      await db
        .insert(organizationsTable)
        .values({ id: organizationId, name: "Test Organization" });
      await expect(
        guardOrganizationMembership(db, userId, organizationId)
      ).rejects.toThrow("この組織にアクセスする権限がありません");
    });

    it("should throw error if user does not have the required role", async () => {
      const userId = "test-user-id";
      const organizationId = "test-organization-id";
      const organizationMemberId = "test-member-id";
      await db.insert(usersTable).values({ id: userId, name: "Test User" });
      await db
        .insert(organizationsTable)
        .values({ id: organizationId, name: "Test Organization" });
      await db.insert(organizationMembersTable).values({
        id: organizationMemberId,
        userId,
        organizationId,
      });

      await expect(
        guardOrganizationMembership(db, userId, organizationId, "admin")
      ).rejects.toThrow("この操作にはadmin権限が必要です");
    });

    it("should not throw error if user is a member and role is not specified", async () => {
      const userId = "test-user-id";
      const organizationId = "test-organization-id";
      const organizationMemberId = "test-member-id";
      await db.insert(usersTable).values({ id: userId, name: "Test User" });
      await db
        .insert(organizationsTable)
        .values({ id: organizationId, name: "Test Organization" });
      await db.insert(organizationMembersTable).values({
        id: organizationMemberId,
        userId,
        organizationId,
      });

      await expect(
        guardOrganizationMembership(db, userId, organizationId)
      ).resolves.not.toThrow();
    });

    it("should not throw error if user is a member with the required role", async () => {
      const userId = "test-user-id";
      const organizationId = "test-organization-id";
      const organizationMemberId = "test-member-id";
      await db.insert(usersTable).values({ id: userId, name: "Test User" });
      await db
        .insert(organizationsTable)
        .values({ id: organizationId, name: "Test Organization" });
      await db.insert(organizationMembersTable).values({
        id: organizationMemberId,
        userId,
        organizationId,
        role: "admin",
      });

      await expect(
        guardOrganizationMembership(db, userId, organizationId, "admin")
      ).resolves.not.toThrow();
    });
  });
});
