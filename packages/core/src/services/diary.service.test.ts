import { describe, it, beforeEach, expect } from "vitest";
import { eq } from "@repo/db";
import { dbClient } from "@repo/db/client";
import {
  organizationMembersTable,
  organizationsTable,
  usersTable,
  diariesTable,
  diaryThingsTable,
  thingsTable,
} from "@repo/db/schema";
import {
  createDiary,
  getDiary,
  listDiaries,
  updateDiary,
  deleteDiary,
} from "./diary.service";

const db = dbClient();

describe("DiaryService", () => {
  let testUserId: string;
  let testOrganizationId: string;
  let testThingId: string;

  beforeEach(async () => {
    // テスト用のデータベースをリセット
    await db.transaction(async (tx) => {
      await tx.delete(diaryThingsTable);
      await tx.delete(diariesTable);
      await tx.delete(thingsTable);
      await tx.delete(organizationMembersTable);
      await tx.delete(organizationsTable);
      await tx.delete(usersTable);
    });

    // テストデータをセットアップ
    testUserId = "test-user-id";
    testOrganizationId = "test-org-id";
    testThingId = "test-thing-id";

    await db.insert(usersTable).values({
      id: testUserId,
      name: "Test User",
    });

    await db.insert(organizationsTable).values({
      id: testOrganizationId,
      name: "Test Organization",
      description: "Test description",
    });

    await db.insert(organizationMembersTable).values({
      id: "test-membership-id",
      userId: testUserId,
      organizationId: testOrganizationId,
      role: "admin",
    });

    await db.insert(thingsTable).values({
      id: testThingId,
      name: "Test Field",
      type: "field",
      organizationId: testOrganizationId,
    });
  });

  describe("createDiary", () => {
    it("should create a diary with required fields", async () => {
      const input = {
        organizationId: testOrganizationId,
        date: "2025-06-05",
        content: "トマトの植え付け作業を行いました。",
        workType: "PLANTING",
        thingIds: [testThingId],
      };

      const result = await createDiary(db, testUserId, input);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.date).toBe(input.date);
      expect(result.content).toBe(input.content);
      expect(result.userId).toBe(testUserId);
      expect(result.organizationId).toBe(input.organizationId);
    });

    it("should create a diary with optional fields", async () => {
      const input = {
        organizationId: testOrganizationId,
        date: "2025-06-05",
        title: "トマト植え付け",
        content: "トマトの植え付け作業を行いました。",
        workType: "PLANTING",
        weather: "晴れ",
        temperature: 25.5,
        thingIds: [testThingId],
      };

      const result = await createDiary(db, testUserId, input);

      expect(result.title).toBe(input.title);
      expect(result.workType).toBe(input.workType);
      expect(result.weather).toBe(input.weather);
      expect(result.temperature).toBe(input.temperature);
    });

    it("should create diary-thing relationships", async () => {
      const input = {
        organizationId: testOrganizationId,
        date: "2025-06-05",
        content: "複数ほ場での作業",
        workType: "OTHER",
        thingIds: [testThingId],
      };

      const result = await createDiary(db, testUserId, input);

      // diaryThingsテーブルに関連付けが作成されているか確認
      const diaryThings = await db
        .select()
        .from(diaryThingsTable)
        .where(eq(diaryThingsTable.diaryId, result.id));

      expect(diaryThings).toHaveLength(1);
      expect(diaryThings[0]!.thingId).toBe(testThingId);
    });

    it("should handle empty thingIds", async () => {
      const input = {
        organizationId: testOrganizationId,
        date: "2025-06-05",
        content: "一般的な農場作業",
        workType: "OTHER",
        thingIds: [],
      };

      const result = await createDiary(db, testUserId, input);

      expect(result).toBeDefined();

      // diaryThingsテーブルに関連付けが作成されていないか確認
      const diaryThings = await db
        .select()
        .from(diaryThingsTable)
        .where(eq(diaryThingsTable.diaryId, result.id));

      expect(diaryThings).toHaveLength(0);
    });

    it("should throw error for invalid thingId permissions", async () => {
      // 別の組織のほ場を作成
      const otherOrgId = "other-org-id";
      const otherThingId = "other-thing-id";

      await db.insert(organizationsTable).values({
        id: otherOrgId,
        name: "Other Organization",
      });

      await db.insert(thingsTable).values({
        id: otherThingId,
        name: "Other Field",
        type: "field",
        organizationId: otherOrgId,
      });

      const input = {
        organizationId: testOrganizationId,
        date: "2025-06-05",
        content: "無効なほ場IDを使用",
        workType: "OTHER",
        thingIds: [otherThingId], // 異なる組織のほ場ID
      };

      await expect(createDiary(db, testUserId, input)).rejects.toThrow(
        "指定されたほ場ID [other-thing-id] は存在しないか、この組織に属していません"
      );
    });

    it("should throw error for non-existent thingId", async () => {
      const input = {
        organizationId: testOrganizationId,
        date: "2025-06-05",
        content: "存在しないほ場IDを使用",
        workType: "OTHER",
        thingIds: ["non-existent-thing-id"],
      };

      await expect(createDiary(db, testUserId, input)).rejects.toThrow(
        "指定されたほ場ID [non-existent-thing-id] は存在しないか、この組織に属していません"
      );
    });

    it("should handle mixed valid and invalid thingIds", async () => {
      const input = {
        organizationId: testOrganizationId,
        date: "2025-06-05",
        content: "混在するほ場ID",
        workType: "OTHER",
        thingIds: [testThingId, "invalid-thing-id"],
      };

      await expect(createDiary(db, testUserId, input)).rejects.toThrow(
        "指定されたほ場ID [invalid-thing-id] は存在しないか、この組織に属していません"
      );
    });
  });

  describe("getDiary", () => {
    it("should get diary with thing relationships", async () => {
      // テスト用日誌を作成
      const input = {
        organizationId: testOrganizationId,
        date: "2025-06-05",
        content: "テスト日誌",
        workType: "PLANTING",
        thingIds: [testThingId],
      };

      const createdDiary = await createDiary(db, testUserId, input);

      // 日誌を取得
      const result = await getDiary(db, {
        diaryId: createdDiary.id,
        organizationId: testOrganizationId,
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe(createdDiary.id);
      expect(result?.content).toBe(input.content);
      expect(result?.diaryThings).toHaveLength(1);
      expect(result?.diaryThings[0]!.thing.name).toBe("Test Field");
    });

    it("should return null for non-existent diary", async () => {
      const result = await getDiary(db, {
        diaryId: "non-existent-id",
        organizationId: testOrganizationId,
      });
      expect(result).toBeNull();
    });

    it("should return null for diary from different organization", async () => {
      // 異なる組織の日誌を作成
      const otherOrgId = "other-org-id";
      await db.insert(organizationsTable).values({
        id: otherOrgId,
        name: "Other Organization",
      });

      const input = {
        organizationId: otherOrgId,
        date: "2025-06-05",
        content: "他組織の日誌",
        workType: "OTHER",
        thingIds: [],
      };

      const createdDiary = await createDiary(db, testUserId, input);

      // 異なる組織IDで取得を試行
      const result = await getDiary(db, {
        diaryId: createdDiary.id,
        organizationId: testOrganizationId,
      });
      expect(result).toBeNull();
    });
  });

  describe("listDiaries", () => {
    it("should list diaries with pagination", async () => {
      // 複数の日誌を作成
      for (let i = 1; i <= 5; i++) {
        await createDiary(db, testUserId, {
          organizationId: testOrganizationId,
          date: `2025-06-0${i}`,
          content: `日誌${i}`,
          workType: "OTHER",
          thingIds: [],
        });
      }

      const result = await listDiaries(db, {
        organizationId: testOrganizationId,
        limit: 3,
        offset: 0,
      });

      expect(result.diaries).toHaveLength(3);
      expect(result.total).toBe(5);
      expect(result.hasNext).toBe(true);
    });

    it("should list diaries ordered by date desc", async () => {
      await createDiary(db, testUserId, {
        organizationId: testOrganizationId,
        date: "2025-06-01",
        content: "古い日誌",
        workType: "OTHER",
        thingIds: [],
      });

      await createDiary(db, testUserId, {
        organizationId: testOrganizationId,
        date: "2025-06-03",
        content: "新しい日誌",
        workType: "PLANTING",
        thingIds: [],
      });

      const result = await listDiaries(db, {
        organizationId: testOrganizationId,
        limit: 10,
        offset: 0,
      });

      expect(result.diaries[0]!.date).toBe("2025-06-03");
      expect(result.diaries[1]!.date).toBe("2025-06-01");
    });

    it("should include thing relationships when includeThings is true", async () => {
      // ほ場関連付けのある日誌を作成
      await createDiary(db, testUserId, {
        organizationId: testOrganizationId,
        date: "2025-06-05",
        content: "ほ場での作業",
        workType: "WEEDING",
        thingIds: [testThingId],
      });

      // includeThings: trueで取得
      const resultWithThings = await listDiaries(db, {
        organizationId: testOrganizationId,
        limit: 10,
        offset: 0,
        includeThings: true,
      });

      expect(resultWithThings.diaries).toHaveLength(1);
      expect(resultWithThings.diaries[0]!.diaryThings).toBeDefined();
      expect(resultWithThings.diaries[0]!.diaryThings!).toHaveLength(1);
      expect(resultWithThings.diaries[0]!.diaryThings![0]!.thing.name).toBe(
        "Test Field"
      );

      // includeThings: falseで取得（デフォルト）
      const resultWithoutThings = await listDiaries(db, {
        organizationId: testOrganizationId,
        limit: 10,
        offset: 0,
      });

      expect(resultWithoutThings.diaries).toHaveLength(1);
      expect(resultWithoutThings.diaries[0]!.diaryThings).toBeUndefined();
    });

    it("should filter diaries by thingId", async () => {
      // 追加のほ場を作成
      const anotherThingId = "another-thing-id";
      await db.insert(thingsTable).values({
        id: anotherThingId,
        name: "Another Field",
        type: "field",
        organizationId: testOrganizationId,
      });

      // 複数の日誌を作成（異なるほ場関連付けで）
      await createDiary(db, testUserId, {
        organizationId: testOrganizationId,
        date: "2025-06-05",
        content: "最初のほ場での作業",
        workType: "FERTILIZING",
        thingIds: [testThingId],
      });

      await createDiary(db, testUserId, {
        organizationId: testOrganizationId,
        date: "2025-06-04",
        content: "別のほ場での作業",
        workType: "WATERING",
        thingIds: [anotherThingId],
      });

      await createDiary(db, testUserId, {
        organizationId: testOrganizationId,
        date: "2025-06-03",
        content: "両方のほ場での作業",
        workType: "HARVESTING",
        thingIds: [testThingId, anotherThingId],
      });

      // testThingIdでフィルタ
      const result = await listDiaries(db, {
        organizationId: testOrganizationId,
        limit: 10,
        offset: 0,
        thingId: testThingId,
      });

      expect(result.diaries).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(
        result.diaries.some((d) => d.content === "最初のほ場での作業")
      ).toBe(true);
      expect(
        result.diaries.some((d) => d.content === "両方のほ場での作業")
      ).toBe(true);
      expect(result.diaries.some((d) => d.content === "別のほ場での作業")).toBe(
        false
      );

      // 存在しないthingIdでフィルタ
      const emptyResult = await listDiaries(db, {
        organizationId: testOrganizationId,
        limit: 10,
        offset: 0,
        thingId: "non-existent-thing-id",
      });

      expect(emptyResult.diaries).toHaveLength(0);
      expect(emptyResult.total).toBe(0);
    });

    it("should not allow filtering by thingId from different organization", async () => {
      // 別の組織とそのほ場を作成
      const otherOrgId = "other-org-id";
      const otherThingId = "other-thing-id";

      await db.insert(organizationsTable).values({
        id: otherOrgId,
        name: "Other Organization",
      });

      await db.insert(thingsTable).values({
        id: otherThingId,
        name: "Other Field",
        type: "field",
        organizationId: otherOrgId,
      });

      // 別の組織で日誌を作成
      await createDiary(db, testUserId, {
        organizationId: otherOrgId,
        date: "2025-06-05",
        content: "他組織の日誌",
        workType: "SEEDING",
        thingIds: [otherThingId],
      });

      // 元の組織で日誌を作成
      await createDiary(db, testUserId, {
        organizationId: testOrganizationId,
        date: "2025-06-04",
        content: "自組織の日誌",
        workType: "PRUNING",
        thingIds: [testThingId],
      });

      // 他組織のthingIdでフィルタを試行 - 結果は空であるべき
      const result = await listDiaries(db, {
        organizationId: testOrganizationId,
        limit: 10,
        offset: 0,
        thingId: otherThingId, // 他組織のthingId
      });

      // 他組織のthingIdでフィルタした場合、結果は空になるべき
      expect(result.diaries).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("should properly filter when thingId exists but has no associated diaries in organization", async () => {
      // 新しいほ場を作成（日誌関連付けなし）
      const unusedThingId = "unused-thing-id";
      await db.insert(thingsTable).values({
        id: unusedThingId,
        name: "Unused Field",
        type: "field",
        organizationId: testOrganizationId,
      });

      // testThingIdに関連付けられた日誌を作成
      await createDiary(db, testUserId, {
        organizationId: testOrganizationId,
        date: "2025-06-05",
        content: "使用されているほ場での作業",
        workType: "SPRAYING",
        thingIds: [testThingId],
      });

      // 使用されていないthingIdでフィルタ
      const result = await listDiaries(db, {
        organizationId: testOrganizationId,
        limit: 10,
        offset: 0,
        thingId: unusedThingId,
      });

      expect(result.diaries).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasNext).toBe(false);
    });
  });

  describe("updateDiary", () => {
    it("should update diary fields", async () => {
      const input = {
        organizationId: testOrganizationId,
        date: "2025-06-05",
        content: "元の内容",
        workType: "PLANTING",
        thingIds: [testThingId],
      };

      const createdDiary = await createDiary(db, testUserId, input);

      const updateInput = {
        title: "更新されたタイトル",
        content: "更新された内容",
        workType: "HARVESTING",
      };

      const result = await updateDiary(
        db,
        testUserId,
        { diaryId: createdDiary.id, organizationId: testOrganizationId },
        updateInput
      );

      expect(result).toBeDefined();
      expect(result.title).toBe(updateInput.title);
      expect(result.content).toBe(updateInput.content);
      expect(result.workType).toBe(updateInput.workType);
      expect(result.date).toBe(input.date); // 変更されていない
    });

    it("should update thing relationships", async () => {
      const input = {
        organizationId: testOrganizationId,
        date: "2025-06-05",
        content: "テスト日誌",
        workType: "WEEDING",
        thingIds: [testThingId],
      };

      const createdDiary = await createDiary(db, testUserId, input);

      // 新しいthingを作成
      const newThingId = "new-thing-id";
      await db.insert(thingsTable).values({
        id: newThingId,
        name: "New Field",
        type: "field",
        organizationId: testOrganizationId,
      });

      const updateInput = {
        content: "更新された内容",
        thingIds: [newThingId],
      };

      await updateDiary(
        db,
        testUserId,
        { diaryId: createdDiary.id, organizationId: testOrganizationId },
        updateInput
      );

      // 関連付けが更新されているか確認
      const diaryThings = await db
        .select()
        .from(diaryThingsTable)
        .where(eq(diaryThingsTable.diaryId, createdDiary.id));

      expect(diaryThings).toHaveLength(1);
      expect(diaryThings[0]!.thingId).toBe(newThingId);
    });

    it("should throw error for invalid thingId permissions on update", async () => {
      // 日誌を作成
      const input = {
        organizationId: testOrganizationId,
        date: "2025-06-05",
        content: "テスト日誌",
        workType: "FERTILIZING",
        thingIds: [testThingId],
      };

      const createdDiary = await createDiary(db, testUserId, input);

      // 別の組織のほ場を作成
      const otherOrgId = "other-org-id";
      const otherThingId = "other-thing-id";

      await db.insert(organizationsTable).values({
        id: otherOrgId,
        name: "Other Organization",
      });

      await db.insert(thingsTable).values({
        id: otherThingId,
        name: "Other Field",
        type: "field",
        organizationId: otherOrgId,
      });

      const updateInput = {
        content: "更新内容",
        thingIds: [otherThingId], // 異なる組織のほ場ID
      };

      await expect(
        updateDiary(
          db,
          testUserId,
          { diaryId: createdDiary.id, organizationId: testOrganizationId },
          updateInput
        )
      ).rejects.toThrow(
        "指定されたほ場ID [other-thing-id] は存在しないか、この組織に属していません"
      );
    });

    it("should throw error for non-existent thingId on update", async () => {
      // 日誌を作成
      const input = {
        organizationId: testOrganizationId,
        date: "2025-06-05",
        content: "テスト日誌",
        workType: "WATERING",
        thingIds: [testThingId],
      };

      const createdDiary = await createDiary(db, testUserId, input);

      const updateInput = {
        content: "更新内容",
        thingIds: ["non-existent-thing-id"],
      };

      await expect(
        updateDiary(
          db,
          testUserId,
          { diaryId: createdDiary.id, organizationId: testOrganizationId },
          updateInput
        )
      ).rejects.toThrow(
        "指定されたほ場ID [non-existent-thing-id] は存在しないか、この組織に属していません"
      );
    });

    it("should handle mixed valid and invalid thingIds on update", async () => {
      // 日誌を作成
      const input = {
        organizationId: testOrganizationId,
        date: "2025-06-05",
        content: "テスト日誌",
        workType: "SEEDING",
        thingIds: [testThingId],
      };

      const createdDiary = await createDiary(db, testUserId, input);

      const updateInput = {
        content: "更新内容",
        thingIds: [testThingId, "invalid-thing-id"],
      };

      await expect(
        updateDiary(
          db,
          testUserId,
          { diaryId: createdDiary.id, organizationId: testOrganizationId },
          updateInput
        )
      ).rejects.toThrow(
        "指定されたほ場ID [invalid-thing-id] は存在しないか、この組織に属していません"
      );
    });

    it("should allow updating with empty thingIds", async () => {
      // 日誌を作成
      const input = {
        organizationId: testOrganizationId,
        date: "2025-06-05",
        content: "テスト日誌",
        workType: "PRUNING",
        thingIds: [testThingId],
      };

      const createdDiary = await createDiary(db, testUserId, input);

      const updateInput = {
        content: "更新内容",
        thingIds: [],
      };

      const result = await updateDiary(
        db,
        testUserId,
        { diaryId: createdDiary.id, organizationId: testOrganizationId },
        updateInput
      );

      expect(result).toBeDefined();
      expect(result.content).toBe(updateInput.content);

      // 関連付けが削除されているか確認
      const diaryThings = await db
        .select()
        .from(diaryThingsTable)
        .where(eq(diaryThingsTable.diaryId, createdDiary.id));

      expect(diaryThings).toHaveLength(0);
    });

    it("should allow updating without specifying thingIds", async () => {
      // 日誌を作成
      const input = {
        organizationId: testOrganizationId,
        date: "2025-06-05",
        content: "テスト日誌",
        workType: "SPRAYING",
        thingIds: [testThingId],
      };

      const createdDiary = await createDiary(db, testUserId, input);

      const updateInput = {
        content: "更新内容",
        title: "更新タイトル",
        // thingIdsを指定しない
      };

      const result = await updateDiary(
        db,
        testUserId,
        { diaryId: createdDiary.id, organizationId: testOrganizationId },
        updateInput
      );

      expect(result).toBeDefined();
      expect(result.content).toBe(updateInput.content);
      expect(result.title).toBe(updateInput.title);

      // 既存の関連付けが保持されているか確認
      const diaryThings = await db
        .select()
        .from(diaryThingsTable)
        .where(eq(diaryThingsTable.diaryId, createdDiary.id));

      expect(diaryThings).toHaveLength(1);
      expect(diaryThings[0]!.thingId).toBe(testThingId);
    });
  });

  describe("deleteDiary", () => {
    it("should delete diary and relationships", async () => {
      const input = {
        organizationId: testOrganizationId,
        date: "2025-06-05",
        content: "削除予定の日誌",
        workType: "OTHER",
        thingIds: [testThingId],
      };

      const createdDiary = await createDiary(db, testUserId, input);

      await deleteDiary(db, testUserId, {
        diaryId: createdDiary.id,
        organizationId: testOrganizationId,
      });

      // 日誌が削除されているか確認
      const diary = await db
        .select()
        .from(diariesTable)
        .where(eq(diariesTable.id, createdDiary.id));

      expect(diary).toHaveLength(0);

      // 関連付けも削除されているか確認（カスケード削除）
      const diaryThings = await db
        .select()
        .from(diaryThingsTable)
        .where(eq(diaryThingsTable.diaryId, createdDiary.id));

      expect(diaryThings).toHaveLength(0);
    });

    it("should return false for non-existent diary", async () => {
      const result = await deleteDiary(db, testUserId, {
        diaryId: "non-existent-id",
        organizationId: testOrganizationId,
      });
      expect(result).toBe(false);
    });
  });
});
