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
  updateDiary,
  deleteDiary,
  getDiariesByDate,
  getDiariesByMonth,
  searchDiaries,
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
        date: "2025-06-05",
        content: "トマトの植え付け作業を行いました。",
        workType: "PLANTING",
        thingIds: [testThingId],
      };

      const result = await createDiary(
        db,
        testUserId,
        testOrganizationId,
        input
      );

      expect(result).toBeDefined();
      expect(result?.id).toBeDefined();
      expect(result?.date).toBe(input.date);
      expect(result?.content).toBe(input.content);
      expect(result?.userId).toBe(testUserId);
      expect(result?.organizationId).toBe(testOrganizationId);
    });

    it("should create a diary with optional fields", async () => {
      const input = {
        date: "2025-06-05",
        title: "トマト植え付け",
        content: "トマトの植え付け作業を行いました。",
        workType: "PLANTING",
        weather: "晴れ",
        temperature: 25.5,
        duration: 3.5,
        thingIds: [testThingId],
      };

      const result = await createDiary(
        db,
        testUserId,
        testOrganizationId,
        input
      );

      expect(result?.title).toBe(input.title);
      expect(result?.workType).toBe(input.workType);
      expect(result?.weather).toBe(input.weather);
      expect(result?.temperature).toBe(input.temperature);
      expect(result?.duration).toBe(input.duration);
    });

    it("should create diary-thing relationships", async () => {
      const input = {
        date: "2025-06-05",
        content: "複数ほ場での作業",
        workType: "OTHER",
        thingIds: [testThingId],
      };

      const result = await createDiary(
        db,
        testUserId,
        testOrganizationId,
        input
      );
      expect(result).toBeDefined();
      if (!result) throw new Error("Diary creation failed");

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
        date: "2025-06-05",
        content: "一般的な農場作業",
        workType: "OTHER",
        thingIds: [],
      };

      const result = await createDiary(
        db,
        testUserId,
        testOrganizationId,
        input
      );
      expect(result).toBeDefined();
      if (!result) throw new Error("Diary creation failed");

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
        date: "2025-06-05",
        content: "無効なほ場IDを使用",
        workType: "OTHER",
        thingIds: [otherThingId], // 異なる組織のほ場ID
      };

      await expect(
        createDiary(db, testUserId, testOrganizationId, input)
      ).rejects.toThrow(
        "指定されたほ場ID [other-thing-id] は存在しないか、この組織に属していません"
      );
    });

    it("should throw error for non-existent thingId", async () => {
      const input = {
        date: "2025-06-05",
        content: "存在しないほ場IDを使用",
        workType: "OTHER",
        thingIds: ["non-existent-thing-id"],
      };

      await expect(
        createDiary(db, testUserId, testOrganizationId, input)
      ).rejects.toThrow(
        "指定されたほ場ID [non-existent-thing-id] は存在しないか、この組織に属していません"
      );
    });

    it("should handle mixed valid and invalid thingIds", async () => {
      const input = {
        date: "2025-06-05",
        content: "混在するほ場ID",
        workType: "OTHER",
        thingIds: [testThingId, "invalid-thing-id"],
      };

      await expect(
        createDiary(db, testUserId, testOrganizationId, input)
      ).rejects.toThrow(
        "指定されたほ場ID [invalid-thing-id] は存在しないか、この組織に属していません"
      );
    });
  });

  describe("getDiary", () => {
    it("should get diary with thing relationships", async () => {
      // テスト用日誌を作成
      const input = {
        date: "2025-06-05",
        content: "テスト日誌",
        workType: "PLANTING",
        thingIds: [testThingId],
      };

      const createdDiary = await createDiary(
        db,
        testUserId,
        testOrganizationId,
        input
      );
      if (!createdDiary) throw new Error("Diary creation failed");

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

      const createdDiary = await createDiary(db, testUserId, otherOrgId, input);
      if (!createdDiary) throw new Error("Diary creation failed");

      // 異なる組織IDで取得を試行
      const result = await getDiary(db, {
        diaryId: createdDiary.id,
        organizationId: testOrganizationId,
      });
      expect(result).toBeNull();
    });
  });

  describe("updateDiary", () => {
    it("should update diary fields", async () => {
      const input = {
        date: "2025-06-05",
        content: "元の内容",
        workType: "PLANTING",
        thingIds: [testThingId],
      };

      const createdDiary = await createDiary(
        db,
        testUserId,
        testOrganizationId,
        input
      );
      if (!createdDiary) throw new Error("Diary creation failed");

      const updateInput = {
        title: "更新されたタイトル",
        content: "更新された内容",
        workType: "HARVESTING",
        duration: 4.0,
        temperature: 28.0,
      };

      const result = await updateDiary(
        db,
        testUserId,
        { diaryId: createdDiary.id, organizationId: testOrganizationId },
        updateInput
      );

      expect(result).toBeDefined();
      expect(result?.title).toBe(updateInput.title);
      expect(result?.content).toBe(updateInput.content);
      expect(result?.workType).toBe(updateInput.workType);
      expect(result?.duration).toBe(updateInput.duration);
      expect(result?.temperature).toBe(updateInput.temperature);
      expect(result?.date).toBe(input.date); // 変更されていない
    });

    it("should update thing relationships", async () => {
      const input = {
        date: "2025-06-05",
        content: "テスト日誌",
        workType: "WEEDING",
        thingIds: [testThingId],
      };

      const createdDiary = await createDiary(
        db,
        testUserId,
        testOrganizationId,
        input
      );
      if (!createdDiary) throw new Error("Diary creation failed");

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
        date: "2025-06-05",
        content: "テスト日誌",
        workType: "FERTILIZING",
        thingIds: [testThingId],
      };

      const createdDiary = await createDiary(
        db,
        testUserId,
        testOrganizationId,
        input
      );
      if (!createdDiary) throw new Error("Diary creation failed");

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
        date: "2025-06-05",
        content: "テスト日誌",
        workType: "WATERING",
        thingIds: [testThingId],
      };

      const createdDiary = await createDiary(
        db,
        testUserId,
        testOrganizationId,
        input
      );
      if (!createdDiary) throw new Error("Diary creation failed");

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
        date: "2025-06-05",
        content: "テスト日誌",
        workType: "SEEDING",
        thingIds: [testThingId],
      };

      const createdDiary = await createDiary(
        db,
        testUserId,
        testOrganizationId,
        input
      );
      if (!createdDiary) throw new Error("Diary creation failed");

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
        date: "2025-06-05",
        content: "テスト日誌",
        workType: "PRUNING",
        thingIds: [testThingId],
      };

      const createdDiary = await createDiary(
        db,
        testUserId,
        testOrganizationId,
        input
      );
      if (!createdDiary) throw new Error("Diary creation failed");

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
      expect(result?.content).toBe(updateInput.content);

      // 関連付けが削除されているか確認
      const diaryThings = await db
        .select()
        .from(diaryThingsTable)
        .where(eq(diaryThingsTable.diaryId, createdDiary.id));

      expect(diaryThings).toHaveLength(0);
    });

    it("should return undefined for non-existent diary on update", async () => {
      const updateInput = {
        content: "更新内容",
        thingIds: [testThingId],
      };

      const result = await updateDiary(
        db,
        testUserId,
        { diaryId: "non-existent-id", organizationId: testOrganizationId },
        updateInput
      );

      expect(result).toBeUndefined();
    });
  });

  describe("deleteDiary", () => {
    it("should delete diary and relationships", async () => {
      const input = {
        date: "2025-06-05",
        content: "削除予定の日誌",
        workType: "OTHER",
        thingIds: [testThingId],
      };

      const createdDiary = await createDiary(
        db,
        testUserId,
        testOrganizationId,
        input
      );
      if (!createdDiary) throw new Error("Diary creation failed");

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

  describe("getDiariesByDate", () => {
    it("should get all diaries for a specific date with full data", async () => {
      const targetDate = "2025-06-05";

      // 同じ日付で複数の日誌を作成
      await createDiary(db, testUserId, testOrganizationId, {
        date: targetDate,
        content: "午前の作業",
        workType: "PLANTING",
        thingIds: [testThingId],
      });

      await createDiary(db, testUserId, testOrganizationId, {
        date: targetDate,
        content: "午後の作業",
        workType: "WATERING",
        thingIds: [testThingId],
      });

      // 異なる日付で日誌を作成（結果に含まれないはず）
      await createDiary(db, testUserId, testOrganizationId, {
        date: "2025-06-06",
        content: "翌日の作業",
        workType: "HARVESTING",
        thingIds: [testThingId],
      });

      const result = await getDiariesByDate(db, testOrganizationId, {
        date: targetDate,
      });

      expect(result).toHaveLength(2);
      expect(result?.every((diary) => diary.date === targetDate)).toBe(true);
      expect(result?.some((diary) => diary.content === "午前の作業")).toBe(
        true
      );
      expect(result?.some((diary) => diary.content === "午後の作業")).toBe(
        true
      );
      expect(result?.some((diary) => diary.content === "翌日の作業")).toBe(
        false
      );

      // フルデータが含まれていることを確認
      expect(result[0]!.diaryThings).toBeDefined();
      expect(result[0]!.diaryThings).toHaveLength(1);
      expect(result[0]!.diaryThings![0]!.thing.name).toBe("Test Field");
    });

    it("should return empty array for date with no diaries", async () => {
      const result = await getDiariesByDate(db, testOrganizationId, {
        date: "2025-06-05",
      });

      expect(result).toHaveLength(0);
    });

    it("should only return diaries for the specified organization", async () => {
      const targetDate = "2025-06-05";

      // 別の組織を作成
      const otherOrgId = "other-org-id";
      await db.insert(organizationsTable).values({
        id: otherOrgId,
        name: "Other Organization",
      });

      // 元の組織で日誌を作成
      await createDiary(db, testUserId, testOrganizationId, {
        date: targetDate,
        content: "自組織の作業",
        workType: "PLANTING",
        thingIds: [testThingId],
      });

      // 別の組織で日誌を作成
      await createDiary(db, testUserId, otherOrgId, {
        date: targetDate,
        content: "他組織の作業",
        workType: "WATERING",
        thingIds: [],
      });

      const result = await getDiariesByDate(db, testOrganizationId, {
        date: targetDate,
      });

      expect(result).toHaveLength(1);
      expect(result[0]!.content).toBe("自組織の作業");
      expect(result[0]!.organizationId).toBe(testOrganizationId);
    });

    it("should order diaries by creation time", async () => {
      const targetDate = "2025-06-05";

      // 複数の日誌を順番に作成
      const diary1 = await createDiary(db, testUserId, testOrganizationId, {
        date: targetDate,
        content: "最初の作業",
        workType: "PLANTING",
        thingIds: [],
      });

      // 少し待ってから次の日誌を作成
      await new Promise((resolve) => setTimeout(resolve, 10));

      const diary2 = await createDiary(db, testUserId, testOrganizationId, {
        date: targetDate,
        content: "二番目の作業",
        workType: "WATERING",
        thingIds: [],
      });
      if (!diary1 || !diary2) throw new Error("Diary creation failed");

      const result = await getDiariesByDate(db, testOrganizationId, {
        date: targetDate,
      });

      expect(result).toHaveLength(2);
      // createdAt順（新しい順）で並んでいることを確認
      expect(result[0]!.id).toBe(diary2.id);
      expect(result[1]!.id).toBe(diary1.id);
    });
  });

  describe("getDiariesByMonth", () => {
    it("should get summary data for all diaries in a month", async () => {
      // 6月の複数の日付で日誌を作成
      await createDiary(db, testUserId, testOrganizationId, {
        date: "2025-06-01",
        content: "6月1日の作業",
        workType: "PLANTING",
        weather: "晴れ",
        thingIds: [testThingId],
      });

      await createDiary(db, testUserId, testOrganizationId, {
        date: "2025-06-05",
        content: "6月5日の作業",
        workType: "WATERING",
        weather: "曇り",
        thingIds: [testThingId],
      });

      await createDiary(db, testUserId, testOrganizationId, {
        date: "2025-06-15",
        content: "6月15日の作業",
        workType: "HARVESTING",
        weather: "雨",
        thingIds: [testThingId],
      });

      // 別の月の日誌（結果に含まれないはず）
      await createDiary(db, testUserId, testOrganizationId, {
        date: "2025-07-01",
        content: "7月1日の作業",
        workType: "PLANTING",
        thingIds: [testThingId],
      });

      const result = await getDiariesByMonth(db, testOrganizationId, {
        year: 2025,
        month: 6,
      });

      expect(result).toHaveLength(3);

      // 各レコードがサマリーデータのみを含んでいることを確認
      result?.forEach((diary) => {
        expect(diary.date).toBeDefined();
        expect(diary.workType).toBeDefined();
        expect(diary.weather).toBeDefined();
        expect(diary.fields).toBeDefined();
        expect(diary.fields.length).toBeGreaterThan(0);
        expect(diary.fields[0]!.id).toBe(testThingId);
        expect(diary.fields[0]!.name).toBe("Test Field");
      });

      // 日付順（新しい順）に並んでいることを確認
      expect(result[0]!.date).toBe("2025-06-15");
      expect(result[1]!.date).toBe("2025-06-05");
      expect(result[2]!.date).toBe("2025-06-01");
    });

    it("should return empty array for month with no diaries", async () => {
      const result = await getDiariesByMonth(db, testOrganizationId, {
        year: 2025,
        month: 6,
      });

      expect(result).toHaveLength(0);
    });

    it("should only return diaries for the specified organization", async () => {
      // 別の組織を作成
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

      // 両方の組織で同じ月に日誌を作成
      await createDiary(db, testUserId, testOrganizationId, {
        date: "2025-06-01",
        content: "自組織の作業",
        workType: "PLANTING",
        thingIds: [testThingId],
      });

      await createDiary(db, testUserId, otherOrgId, {
        date: "2025-06-01",
        content: "他組織の作業",
        workType: "WATERING",
        thingIds: [otherThingId],
      });

      const result = await getDiariesByMonth(db, testOrganizationId, {
        year: 2025,
        month: 6,
      });

      expect(result).toHaveLength(1);
      expect(result[0]!.fields[0]!.id).toBe(testThingId);
      expect(result[0]!.fields[0]!.name).toBe("Test Field");
    });

    it("should handle diaries with multiple fields correctly", async () => {
      // 追加のほ場を作成
      const anotherThingId = "another-thing-id";
      await db.insert(thingsTable).values({
        id: anotherThingId,
        name: "Another Field",
        type: "field",
        organizationId: testOrganizationId,
      });

      // 複数のほ場に関連付けられた日誌を作成
      await createDiary(db, testUserId, testOrganizationId, {
        date: "2025-06-01",
        content: "複数ほ場での作業",
        workType: "PLANTING",
        weather: "晴れ",
        thingIds: [testThingId, anotherThingId],
      });

      const result = await getDiariesByMonth(db, testOrganizationId, {
        year: 2025,
        month: 6,
      });

      expect(result).toHaveLength(1);
      expect(result[0]!.fields).toHaveLength(2);

      const fieldNames = result[0]!.fields.map((f) => f.name);
      expect(fieldNames).toContain("Test Field");
      expect(fieldNames).toContain("Another Field");
    });

    it("should handle different months and years correctly", async () => {
      // 異なる年月で日誌を作成
      await createDiary(db, testUserId, testOrganizationId, {
        date: "2025-06-01",
        content: "2025年6月の作業",
        workType: "PLANTING",
        thingIds: [testThingId],
      });

      await createDiary(db, testUserId, testOrganizationId, {
        date: "2025-07-01",
        content: "2025年7月の作業",
        workType: "WATERING",
        thingIds: [testThingId],
      });

      await createDiary(db, testUserId, testOrganizationId, {
        date: "2024-06-01",
        content: "2024年6月の作業",
        workType: "HARVESTING",
        thingIds: [testThingId],
      });

      // 2025年6月のデータを取得
      const result2025_06 = await getDiariesByMonth(db, testOrganizationId, {
        year: 2025,
        month: 6,
      });

      expect(result2025_06).toHaveLength(1);
      expect(result2025_06[0]!.date).toBe("2025-06-01");

      // 2025年7月のデータを取得
      const result2025_07 = await getDiariesByMonth(db, testOrganizationId, {
        year: 2025,
        month: 7,
      });

      expect(result2025_07).toHaveLength(1);
      expect(result2025_07[0]!.date).toBe("2025-07-01");

      // 2024年6月のデータを取得
      const result2024_06 = await getDiariesByMonth(db, testOrganizationId, {
        year: 2024,
        month: 6,
      });

      expect(result2024_06).toHaveLength(1);
      expect(result2024_06[0]!.date).toBe("2024-06-01");
    });
  });

  describe("searchDiaries", () => {
    beforeEach(async () => {
      // 追加のほ場を作成
      const anotherThingId = "another-thing-id";
      await db.insert(thingsTable).values({
        id: anotherThingId,
        name: "Another Field",
        type: "field",
        organizationId: testOrganizationId,
      });

      // 検索用のテストデータを作成
      await createDiary(db, testUserId, testOrganizationId, {
        date: "2025-06-01",
        title: "トマト植え付け",
        content: "トマトの苗を植え付けました。土壌の状態が良好です。",
        workType: "PLANTING",
        weather: "晴れ",
        thingIds: [testThingId],
      });

      await createDiary(db, testUserId, testOrganizationId, {
        date: "2025-06-05",
        title: "水やり作業",
        content: "トマトとキュウリに水やりを行いました。",
        workType: "WATERING",
        weather: "曇り",
        thingIds: [testThingId, anotherThingId],
      });

      await createDiary(db, testUserId, testOrganizationId, {
        date: "2025-06-10",
        title: "収穫作業",
        content: "キュウリを収穫しました。豊作でした。",
        workType: "HARVESTING",
        weather: "晴れ",
        thingIds: [anotherThingId],
      });

      await createDiary(db, testUserId, testOrganizationId, {
        date: "2025-06-15",
        title: "除草作業",
        content: "雑草を除去しました。",
        workType: "WEEDING",
        weather: "雨",
        thingIds: [],
      });
    });

    it("should search by text content", async () => {
      const result = await searchDiaries(db, testOrganizationId, {
        limit: 10,
        offset: 0,
        search: "トマト",
        sortBy: "date",
        sortOrder: "desc",
      });

      expect(result?.diaries).toHaveLength(2);
      expect(result?.total).toBe(2);
      expect(result?.diaries.some((d) => d.title === "トマト植え付け")).toBe(
        true
      );
      expect(result?.diaries.some((d) => d.title === "水やり作業")).toBe(true);
    });

    it("should search by work type", async () => {
      const result = await searchDiaries(db, testOrganizationId, {
        limit: 10,
        offset: 0,
        workTypes: ["PLANTING", "HARVESTING"],
        sortBy: "date",
        sortOrder: "desc",
      });

      expect(result?.diaries).toHaveLength(2);
      expect(result?.total).toBe(2);
      expect(result?.diaries.some((d) => d.workType === "PLANTING")).toBe(true);
      expect(result?.diaries.some((d) => d.workType === "HARVESTING")).toBe(
        true
      );
    });

    it("should search by date range", async () => {
      const result = await searchDiaries(db, testOrganizationId, {
        limit: 10,
        offset: 0,
        dateFrom: "2025-06-05",
        dateTo: "2025-06-10",
        sortBy: "date",
        sortOrder: "desc",
      });

      expect(result?.diaries).toHaveLength(2);
      expect(result?.total).toBe(2);
      expect(
        result?.diaries.every(
          (d) => d.date >= "2025-06-05" && d.date <= "2025-06-10"
        )
      ).toBe(true);
    });

    it("should search by thing IDs", async () => {
      const anotherThingId = "another-thing-id";

      const result = await searchDiaries(db, testOrganizationId, {
        limit: 10,
        offset: 0,
        thingIds: [anotherThingId],
        sortBy: "date",
        sortOrder: "desc",
      });

      expect(result?.diaries).toHaveLength(2);
      expect(result?.total).toBe(2);
      expect(result?.diaries.some((d) => d.title === "水やり作業")).toBe(true);
      expect(result?.diaries.some((d) => d.title === "収穫作業")).toBe(true);
    });

    it("should search by weather", async () => {
      const result = await searchDiaries(db, testOrganizationId, {
        limit: 10,
        offset: 0,
        weather: ["晴れ"],
        sortBy: "date",
        sortOrder: "desc",
      });

      expect(result?.diaries).toHaveLength(2);
      expect(result?.total).toBe(2);
      expect(result?.diaries.every((d) => d.weather === "晴れ")).toBe(true);
    });

    it("should combine multiple search criteria", async () => {
      const result = await searchDiaries(db, testOrganizationId, {
        limit: 10,
        offset: 0,
        search: "トマト",
        workTypes: ["PLANTING"],
        weather: ["晴れ"],
        sortBy: "date",
        sortOrder: "desc",
      });

      expect(result?.diaries).toHaveLength(1);
      expect(result?.total).toBe(1);
      expect(result?.diaries[0]!.title).toBe("トマト植え付け");
    });

    it("should handle pagination correctly", async () => {
      const page1 = await searchDiaries(db, testOrganizationId, {
        limit: 2,
        offset: 0,
        sortBy: "date",
        sortOrder: "desc",
      });

      expect(page1.diaries).toHaveLength(2);
      expect(page1.total).toBe(4);
      expect(page1.hasNext).toBe(true);

      const page2 = await searchDiaries(db, testOrganizationId, {
        limit: 2,
        offset: 2,
        sortBy: "date",
        sortOrder: "desc",
      });

      expect(page2.diaries).toHaveLength(2);
      expect(page2.total).toBe(4);
      expect(page2.hasNext).toBe(false);

      // ページ間で重複がないことを確認
      const page1Ids = page1.diaries.map((d) => d.id);
      const page2Ids = page2.diaries.map((d) => d.id);
      expect(page1Ids.some((id) => page2Ids.includes(id))).toBe(false);
    });

    it("should order results by date desc", async () => {
      const result = await searchDiaries(db, testOrganizationId, {
        limit: 10,
        offset: 0,
        sortBy: "date",
        sortOrder: "desc",
      });

      expect(result?.diaries).toHaveLength(4);

      // 日付の降順で並んでいることを確認
      for (let i = 0; i < result?.diaries.length - 1; i++) {
        expect(result?.diaries[i]!.date >= result?.diaries[i + 1]!.date).toBe(
          true
        );
      }
    });

    it("should include thing relationships", async () => {
      const result = await searchDiaries(db, testOrganizationId, {
        limit: 10,
        offset: 0,
        search: "水やり",
        sortBy: "date",
        sortOrder: "desc",
      });

      expect(result?.diaries).toHaveLength(1);
      expect(result?.diaries[0]!.diaryThings).toBeDefined();
      expect(result?.diaries[0]!.diaryThings).toHaveLength(2);

      const thingNames = result?.diaries[0]!.diaryThings!.map(
        (dt) => dt.thing.name
      );
      expect(thingNames).toContain("Test Field");
      expect(thingNames).toContain("Another Field");
    });

    it("should return empty results for no matches", async () => {
      const result = await searchDiaries(db, testOrganizationId, {
        limit: 10,
        offset: 0,
        search: "存在しないキーワード",
        sortBy: "date",
        sortOrder: "desc",
      });

      expect(result?.diaries).toHaveLength(0);
      expect(result?.total).toBe(0);
      expect(result?.hasNext).toBe(false);
    });

    it("should only return results for the specified organization", async () => {
      // 別の組織を作成
      const otherOrgId = "other-org-id";
      await db.insert(organizationsTable).values({
        id: otherOrgId,
        name: "Other Organization",
      });

      // 別の組織で日誌を作成
      await createDiary(db, testUserId, otherOrgId, {
        date: "2025-06-01",
        title: "他組織のトマト作業",
        content: "他組織でのトマト植え付け",
        workType: "PLANTING",
        thingIds: [],
      });

      const result = await searchDiaries(db, testOrganizationId, {
        limit: 10,
        offset: 0,
        search: "トマト",
        sortBy: "date",
        sortOrder: "desc",
      });

      expect(result?.diaries).toHaveLength(2);
      expect(
        result?.diaries.every((d) => d.organizationId === testOrganizationId)
      ).toBe(true);
      expect(
        result?.diaries.some((d) => d.title === "他組織のトマト作業")
      ).toBe(false);
    });

    it("should handle edge cases for date ranges", async () => {
      // 存在しない日付範囲で検索
      const result = await searchDiaries(db, testOrganizationId, {
        limit: 10,
        offset: 0,
        dateFrom: "2025-07-01",
        dateTo: "2025-07-31",
        sortBy: "date",
        sortOrder: "desc",
      });

      expect(result?.diaries).toHaveLength(0);
      expect(result?.total).toBe(0);
    });

    it("should handle multiple thing IDs correctly", async () => {
      const anotherThingId = "another-thing-id";

      const result = await searchDiaries(db, testOrganizationId, {
        limit: 10,
        offset: 0,
        thingIds: [testThingId, anotherThingId],
        sortBy: "date",
        sortOrder: "desc",
      });

      expect(result?.diaries).toHaveLength(3);
      expect(result?.total).toBe(3);
      // 除草作業（thingIds: []）は含まれないはず
      expect(result?.diaries.some((d) => d.title === "除草作業")).toBe(false);
    });
  });
});
