import { describe, it, expect, beforeEach } from "vitest";
import {
  organizationsTable,
  organizationMembersTable,
  usersTable,
  thingsTable,
} from "../schema";
import { createTestDashboardD1Client } from "../testing";
import { D1ThingRepo } from "./thing";
import { CreateThingInput, UpdateThingInput } from "../../../interfaces";
import { DashboardDBError } from "../../../errors";

const db = await createTestDashboardD1Client();
const repo = new D1ThingRepo(db);

describe("D1ThingRepo", () => {
  let testOrganizationId: string;
  let testUserId: string;
  let testOtherOrganizationId: string;
  let testOtherUserId: string;

  beforeEach(async () => {
    // テスト用のデータベースをリセット
    await db.delete(thingsTable);
    await db.delete(organizationMembersTable);
    await db.delete(organizationsTable);
    await db.delete(usersTable);

    // テストデータをセットアップ
    testUserId = "test-user-id";
    testOtherUserId = "test-other-user-id";
    testOrganizationId = "test-org-id";
    testOtherOrganizationId = "test-other-org-id";

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

    // 組織作成
    await db.insert(organizationsTable).values([
      {
        id: testOrganizationId,
        name: "テスト農園",
        description: "テスト用の農園です",
      },
      {
        id: testOtherOrganizationId,
        name: "他の農園",
        description: "他のユーザーの農園です",
      },
    ]);

    // 組織メンバーシップ作成
    await db.insert(organizationMembersTable).values([
      {
        id: "test-membership-id",
        userId: testUserId,
        organizationId: testOrganizationId,
        role: "admin",
      },
      {
        id: "test-other-membership-id",
        userId: testOtherUserId,
        organizationId: testOtherOrganizationId,
        role: "admin",
      },
    ]);
  });

  describe("create", () => {
    it("新しいほ場を作成できる", async () => {
      // Arrange
      const input: CreateThingInput = {
        organizationId: testOrganizationId,
        name: "第1圃場",
        type: "field",
        description: "露地栽培用の圃場",
        location: "北緯35.6762度, 東経139.6503度",
        area: 1000,
      };

      // Act
      const result = await repo.create(input);

      // Assert
      expect(result).toBeDefined();
      expect(result?.name).toBe("第1圃場");
      expect(result?.type).toBe("field");
      expect(result?.description).toBe("露地栽培用の圃場");
      expect(result?.location).toBe("北緯35.6762度, 東経139.6503度");
      expect(result?.area).toBe(1000);
      expect(result?.organizationId).toBe(testOrganizationId);
      expect(result?.id).toMatch(/^tng_/);
    });

    it("最小限の必須フィールドでほ場を作成できる", async () => {
      // Arrange
      const input: CreateThingInput = {
        organizationId: testOrganizationId,
        name: "ハウス1",
        type: "greenhouse",
      };

      // Act
      const result = await repo.create(input);

      // Assert
      expect(result).toBeDefined();
      expect(result?.name).toBe("ハウス1");
      expect(result?.type).toBe("greenhouse");
      expect(result?.description).toBe("");
      expect(result?.location).toBeNull();
      expect(result?.area).toBeNull();
      expect(result?.organizationId).toBe(testOrganizationId);
    });

    it("オプショナルフィールドに明示的にnullを設定してほ場を作成できる", async () => {
      // Arrange
      const input: CreateThingInput = {
        organizationId: testOrganizationId,
        name: "テスト圃場",
        type: "field",
        location: null,
        area: null,
      };

      // Act
      const result = await repo.create(input);

      // Assert
      expect(result).toBeDefined();
      expect(result?.name).toBe("テスト圃場");
      expect(result?.type).toBe("field");
      expect(result?.description).toBe("");
      expect(result?.location).toBeNull();
      expect(result?.area).toBeNull();
      expect(result?.organizationId).toBe(testOrganizationId);
    });
  });

  describe("listByOrganizationId", () => {
    beforeEach(async () => {
      // テスト用ほ場データを作成
      await db.insert(thingsTable).values([
        {
          id: "test-thing-1",
          name: "第1圃場",
          type: "field",
          description: "メインの露地圃場",
          organizationId: testOrganizationId,
        },
        {
          id: "test-thing-2",
          name: "ハウス1",
          type: "greenhouse",
          description: "温室栽培用",
          organizationId: testOrganizationId,
        },
        {
          id: "test-thing-3",
          name: "他の圃場",
          type: "field",
          organizationId: testOtherOrganizationId,
        },
      ]);
    });

    it("組織のほ場一覧を取得できる", async () => {
      // Act
      const result = await repo.listByOrganizationId(testOrganizationId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]?.name).toBe("第1圃場");
      expect(result[1]?.name).toBe("ハウス1");
      expect(
        result.every((thing) => thing.organizationId === testOrganizationId)
      ).toBe(true);
    });

    it("存在しない組織でも空配列を返す", async () => {
      // Act
      const result = await repo.listByOrganizationId("org_nonexistent");

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe("findById", () => {
    let testThingId: string;

    beforeEach(async () => {
      testThingId = "test-thing-detail";
      await db.insert(thingsTable).values({
        id: testThingId,
        name: "テスト圃場",
        type: "field",
        description: "詳細取得テスト用",
        location: "テスト地点",
        area: 500,
        organizationId: testOrganizationId,
      });
    });

    it("ほ場の詳細を取得できる", async () => {
      // Act
      const result = await repo.findById({
        thingId: testThingId,
        organizationId: testOrganizationId,
      });

      // Assert
      expect(result).toBeDefined();
      expect(result?.id).toBe(testThingId);
      expect(result?.name).toBe("テスト圃場");
      expect(result?.type).toBe("field");
      expect(result?.description).toBe("詳細取得テスト用");
      expect(result?.location).toBe("テスト地点");
      expect(result?.area).toBe(500);
    });

    it("存在しないほ場IDでnullを返す", async () => {
      // Act & Assert
      const res = await repo.findById({
        thingId: "thing_nonexistent",
        organizationId: testOrganizationId,
      });
      expect(res).toBeNull();
    });
  });

  describe("update", () => {
    let testThingId: string;

    beforeEach(async () => {
      testThingId = "test-thing-update";
      await db.insert(thingsTable).values({
        id: testThingId,
        name: "更新前圃場",
        type: "field",
        description: "更新前の説明",
        organizationId: testOrganizationId,
      });
    });

    it("ほ場の情報を更新できる", async () => {
      // Arrange
      const input: UpdateThingInput = {
        name: "更新後圃場",
        description: "更新後の説明",
        location: "新しい場所",
        area: 1500,
      };

      // Act
      const result = await repo.update(
        { thingId: testThingId, organizationId: testOrganizationId },
        input
      );

      // Assert
      expect(result?.name).toBe("更新後圃場");
      expect(result?.description).toBe("更新後の説明");
      expect(result?.location).toBe("新しい場所");
      expect(result?.area).toBe(1500);
      expect(result?.type).toBe("field"); // 変更されていない
    });

    it("部分的な更新ができる", async () => {
      // Arrange
      const input: UpdateThingInput = {
        name: "部分更新圃場",
      };

      // Act
      const result = await repo.update(
        { thingId: testThingId, organizationId: testOrganizationId },
        input
      );
      // Assert
      expect(result?.name).toBe("部分更新圃場");
      expect(result?.description).toBe("更新前の説明"); // 変更されていない
      expect(result?.type).toBe("field"); // 変更されていない
    });

    it("フィールドをnullにリセットできる", async () => {
      // Arrange
      const input: UpdateThingInput = {
        location: null,
        area: null,
      };

      // Act
      const result = await repo.update(
        { thingId: testThingId, organizationId: testOrganizationId },
        input
      );

      // Assert
      expect(result?.name).toBe("更新前圃場"); // 変更されていない
      expect(result?.location).toBeNull(); // nullにリセット
      expect(result?.area).toBeNull(); // nullにリセット
      expect(result?.type).toBe("field"); // 変更されていない
    });

    it("存在しないほ場IDでエラーを投げる", () => {
      // Arrange
      const input: UpdateThingInput = {
        name: "存在しない圃場",
      };

      // Act & Assert
      expect(
        repo.update(
          { thingId: "thing_nonexistent", organizationId: testOrganizationId },
          input
        )
      ).rejects.toThrow(DashboardDBError);
    });
  });

  describe("delete", () => {
    let testThingId: string;

    beforeEach(async () => {
      testThingId = "test-thing-delete";
      await db.insert(thingsTable).values({
        id: testThingId,
        name: "削除対象圃場",
        type: "field",
        organizationId: testOrganizationId,
      });
    });

    it("ほ場を削除できる", async () => {
      // Act
      await repo.delete({
        thingId: testThingId,
        organizationId: testOrganizationId,
      });

      // Assert - ほ場が削除されていることを確認
      const result = await repo.findById({
        thingId: testThingId,
        organizationId: testOrganizationId,
      });
      expect(result).toBeNull();
    });

    it("存在しないほ場でfalseを返す", async () => {
      // Act & Assert
      const result = await repo.delete({
        thingId: "thing_nonexistent",
        organizationId: testOrganizationId,
      });
      expect(result).toBe(false);
    });
  });
});
