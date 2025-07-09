import { describe, it, expect, beforeEach } from "vitest";
import {
  organizationsTable,
  organizationMembersTable,
  usersTable,
  diariesTable,
  diaryThingsTable,
  thingsTable,
} from "../schema";
import { createTestDashboardD1Client } from "../testing";
import { D1DiaryRepo } from "./diary";
import {
  CreateDiaryInput,
  UpdateDiaryInput,
  GetDiariesByDateInput,
  GetDiariesByDateRangeInput,
  SearchDiariesInput,
} from "../../../interfaces";
import { DashboardDBError } from "../../../errors";
import { eq } from "drizzle-orm";

const db = await createTestDashboardD1Client();
const repo = new D1DiaryRepo(db);

describe("D1DiaryRepo", () => {
  let testUserId: string;
  let testOrganizationId: string;
  let testThingId: string;
  let testMembership: { userId: string; organizationId: string };

  beforeEach(async () => {
    // テスト用のデータベースをリセット
    await db.delete(diaryThingsTable);
    await db.delete(diariesTable);
    await db.delete(thingsTable);
    await db.delete(organizationMembersTable);
    await db.delete(organizationsTable);
    await db.delete(usersTable);

    // テストデータをセットアップ
    testUserId = "test-user-id";
    testOrganizationId = "test-org-id";
    testThingId = "test-thing-id";
    testMembership = {
      userId: testUserId,
      organizationId: testOrganizationId,
    };

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

  describe("create", () => {
    it("必須フィールドで日誌を作成できる", async () => {
      // Arrange
      const input: CreateDiaryInput = {
        date: "2025-06-05",
        content: "トマトの植え付け作業を行いました。",
        workType: "PLANTING",
        thingIds: [testThingId],
      };

      // Act
      const result = await repo.create(testMembership, input);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.id).toMatch(/^diy_/);
      expect(result.date).toBe(input.date);
      expect(result.content).toBe(input.content);
      expect(result.workType).toBe(input.workType);
      expect(result.userId).toBe(testUserId);
      expect(result.organizationId).toBe(testOrganizationId);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it("オプションフィールドありで日誌を作成できる", async () => {
      // Arrange
      const input: CreateDiaryInput = {
        date: "2025-06-05",
        title: "トマト植え付け",
        content: "トマトの植え付け作業を行いました。",
        workType: "PLANTING",
        weather: "晴れ",
        temperature: 25.5,
        duration: 3.5,
        thingIds: [testThingId],
      };

      // Act
      const result = await repo.create(testMembership, input);

      // Assert
      expect(result.title).toBe(input.title);
      expect(result.workType).toBe(input.workType);
      expect(result.weather).toBe(input.weather);
      expect(result.temperature).toBe(input.temperature);
      expect(result.duration).toBe(input.duration);
    });

    it("日誌とほ場の関連付けを作成できる", async () => {
      // Arrange
      const input: CreateDiaryInput = {
        date: "2025-06-05",
        content: "複数ほ場での作業",
        workType: "OTHER",
        thingIds: [testThingId],
      };

      // Act
      const result = await repo.create(testMembership, input);

      // Assert
      expect(result).toBeDefined();

      // diaryThingsテーブルに関連付けが作成されているか確認
      const diaryThings = await db
        .select()
        .from(diaryThingsTable)
        .where(eq(diaryThingsTable.diaryId, result.id));

      expect(diaryThings).toHaveLength(1);
      expect(diaryThings[0]?.thingId).toBe(testThingId);
    });

    it("空のthingIdsで日誌を作成できる", async () => {
      // Arrange
      const input: CreateDiaryInput = {
        date: "2025-06-05",
        content: "一般的な農場作業",
        workType: "OTHER",
        thingIds: [],
      };

      // Act
      const result = await repo.create(testMembership, input);

      // Assert
      expect(result).toBeDefined();

      // diaryThingsテーブルに関連付けが作成されていないか確認
      const diaryThings = await db
        .select()
        .from(diaryThingsTable)
        .where(eq(diaryThingsTable.diaryId, result.id));

      expect(diaryThings).toHaveLength(0);
    });

    it("無効なthingId権限でエラーを投げる", async () => {
      // Arrange
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

      const input: CreateDiaryInput = {
        date: "2025-06-05",
        content: "無効なほ場IDを使用",
        workType: "OTHER",
        thingIds: [otherThingId], // 異なる組織のほ場ID
      };

      // Act & Assert
      await expect(repo.create(testMembership, input)).rejects.toThrow(
        DashboardDBError
      );
      await expect(repo.create(testMembership, input)).rejects.toThrow(
        "指定されたほ場ID [other-thing-id] は存在しないか、この組織に属していません"
      );
    });

    it("存在しないthingIdでエラーを投げる", async () => {
      // Arrange
      const input: CreateDiaryInput = {
        date: "2025-06-05",
        content: "存在しないほ場IDを使用",
        workType: "OTHER",
        thingIds: ["non-existent-thing-id"],
      };

      // Act & Assert
      await expect(repo.create(testMembership, input)).rejects.toThrow(
        DashboardDBError
      );
      await expect(repo.create(testMembership, input)).rejects.toThrow(
        "指定されたほ場ID [non-existent-thing-id] は存在しないか、この組織に属していません"
      );
    });

    it("有効と無効なthingIdが混在している場合エラーを投げる", async () => {
      // Arrange
      const input: CreateDiaryInput = {
        date: "2025-06-05",
        content: "混在するほ場ID",
        workType: "OTHER",
        thingIds: [testThingId, "invalid-thing-id"],
      };

      // Act & Assert
      await expect(repo.create(testMembership, input)).rejects.toThrow(
        DashboardDBError
      );
      await expect(repo.create(testMembership, input)).rejects.toThrow(
        "指定されたほ場ID [invalid-thing-id] は存在しないか、この組織に属していません"
      );
    });
  });

  describe("findById", () => {
    it("ほ場関連付けありの日誌を取得できる", async () => {
      // Arrange
      const input: CreateDiaryInput = {
        date: "2025-06-05",
        content: "テスト日誌",
        workType: "PLANTING",
        thingIds: [testThingId],
      };

      const createdDiary = await repo.create(testMembership, input);

      // Act
      const result = await repo.findById({
        diaryId: createdDiary.id,
        organizationId: testOrganizationId,
      });

      // Assert
      expect(result).toBeDefined();
      expect(result?.id).toBe(createdDiary.id);
      expect(result?.content).toBe(input.content);
      expect(result?.diaryThings).toHaveLength(1);
      expect(result?.diaryThings?.[0]?.thing.name).toBe("Test Field");
      expect(result?.userName).toBe("Test User");
    });

    it("存在しない日誌でnullを返す", async () => {
      // Act
      const result = await repo.findById({
        diaryId: "non-existent-id",
        organizationId: testOrganizationId,
      });

      // Assert
      expect(result).toBeNull();
    });

    it("異なる組織の日誌でnullを返す", async () => {
      // Arrange
      // 異なる組織の日誌を作成
      const otherOrgId = "other-org-id";
      await db.insert(organizationsTable).values({
        id: otherOrgId,
        name: "Other Organization",
      });

      const input: CreateDiaryInput = {
        date: "2025-06-05",
        content: "他組織の日誌",
        workType: "OTHER",
        thingIds: [],
      };

      const createdDiary = await repo.create(
        { userId: testUserId, organizationId: otherOrgId },
        input
      );

      // Act - 異なる組織IDで取得を試行
      const result = await repo.findById({
        diaryId: createdDiary.id,
        organizationId: testOrganizationId,
      });

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("findByDate", () => {
    it("指定日の全日誌をフルデータで取得できる", async () => {
      // Arrange
      const targetDate = "2025-06-05";

      // 同じ日付で複数の日誌を作成
      await repo.create(testMembership, {
        date: targetDate,
        content: "午前の作業",
        workType: "PLANTING",
        thingIds: [testThingId],
      });

      await repo.create(testMembership, {
        date: targetDate,
        content: "午後の作業",
        workType: "WATERING",
        thingIds: [testThingId],
      });

      // 異なる日付で日誌を作成（結果に含まれないはず）
      await repo.create(testMembership, {
        date: "2025-06-06",
        content: "翌日の作業",
        workType: "HARVESTING",
        thingIds: [testThingId],
      });

      const input: GetDiariesByDateInput = {
        date: targetDate,
      };

      // Act
      const result = await repo.findByDate(testOrganizationId, input);

      // Assert
      expect(result).toHaveLength(2);
      expect(result.every((diary) => diary.date === targetDate)).toBe(true);
      expect(result.some((diary) => diary.content === "午前の作業")).toBe(true);
      expect(result.some((diary) => diary.content === "午後の作業")).toBe(true);
      expect(result.some((diary) => diary.content === "翌日の作業")).toBe(false);

      // フルデータが含まれていることを確認
      expect(result[0]?.diaryThings).toBeDefined();
      expect(result[0]?.diaryThings).toHaveLength(1);
      expect(result[0]?.diaryThings?.[0]?.thing.name).toBe("Test Field");
    });

    it("日誌がない日付で空配列を返す", async () => {
      // Act
      const result = await repo.findByDate(testOrganizationId, {
        date: "2025-06-05",
      });

      // Assert
      expect(result).toHaveLength(0);
    });

    it("指定した組織の日誌のみ返す", async () => {
      // Arrange
      const targetDate = "2025-06-05";

      // 別の組織を作成
      const otherOrgId = "other-org-id";
      await db.insert(organizationsTable).values({
        id: otherOrgId,
        name: "Other Organization",
      });

      // 元の組織で日誌を作成
      await repo.create(testMembership, {
        date: targetDate,
        content: "自組織の作業",
        workType: "PLANTING",
        thingIds: [testThingId],
      });

      // 別の組織で日誌を作成
      await repo.create(
        { userId: testUserId, organizationId: otherOrgId },
        {
          date: targetDate,
          content: "他組織の作業",
          workType: "WATERING",
          thingIds: [],
        }
      );

      // Act
      const result = await repo.findByDate(testOrganizationId, {
        date: targetDate,
      });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]?.content).toBe("自組織の作業");
      expect(result[0]?.organizationId).toBe(testOrganizationId);
    });

    it("作成時刻順で日誌を並べる", async () => {
      // Arrange
      const targetDate = "2025-06-05";

      // 複数の日誌を順番に作成
      const diary1 = await repo.create(testMembership, {
        date: targetDate,
        content: "最初の作業",
        workType: "PLANTING",
        thingIds: [],
      });

      const diary2 = await repo.create(testMembership, {
        date: targetDate,
        content: "二番目の作業",
        workType: "WATERING",
        thingIds: [],
      });
      // createdAtを修正
      await db
        .update(diariesTable)
        .set({ createdAt: new Date("2025-06-05T10:00:00Z") })
        .where(eq(diariesTable.id, diary1.id));
      await db
        .update(diariesTable)
        .set({ createdAt: new Date("2025-06-05T12:00:00Z") })
        .where(eq(diariesTable.id, diary2.id));

      // Act
      const result = await repo.findByDate(testOrganizationId, {
        date: targetDate,
      });

      // Assert
      expect(result).toHaveLength(2);
      // createdAt順（新しい順）で並んでいることを確認
      expect(result[0]?.id).toBe(diary2.id);
      expect(result[1]?.id).toBe(diary1.id);
    });
  });

  describe("findByDateRange", () => {
    it("指定期間の日誌をサマリー情報で取得できる", async () => {
      // Arrange
      await repo.create(testMembership, {
        date: "2025-06-01",
        content: "1日目の作業",
        workType: "PLANTING",
        weather: "晴れ",
        duration: 2.0,
        thingIds: [testThingId],
      });

      await repo.create(testMembership, {
        date: "2025-06-05",
        content: "5日目の作業",
        workType: "WATERING",
        weather: "曇り",
        duration: 1.5,
        thingIds: [testThingId],
      });

      // 範囲外の日誌
      await repo.create(testMembership, {
        date: "2025-05-30",
        content: "範囲外の作業",
        workType: "OTHER",
        thingIds: [],
      });

      const input: GetDiariesByDateRangeInput = {
        startDate: "2025-06-01",
        endDate: "2025-06-10",
      };

      // Act
      const result = await repo.findByDateRange(testOrganizationId, input);

      // Assert
      expect(result).toHaveLength(2);
      expect(result.every((diary) => diary.date >= "2025-06-01" && diary.date <= "2025-06-10")).toBe(true);
      expect(result[0]?.fields).toBeDefined();
      expect(result[0]?.fields).toHaveLength(1);
      expect(result[0]?.fields?.[0]?.name).toBe("Test Field");
    });
  });

  describe("search", () => {
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
      await repo.create(testMembership, {
        date: "2025-06-01",
        title: "トマト植え付け",
        content: "トマトの苗を植え付けました。土壌の状態が良好です。",
        workType: "PLANTING",
        weather: "晴れ",
        thingIds: [testThingId],
      });

      await repo.create(testMembership, {
        date: "2025-06-05",
        title: "水やり作業",
        content: "トマトとキュウリに水やりを行いました。",
        workType: "WATERING",
        weather: "曇り",
        thingIds: [testThingId, anotherThingId],
      });

      await repo.create(testMembership, {
        date: "2025-06-10",
        title: "収穫作業",
        content: "キュウリを収穫しました。豊作でした。",
        workType: "HARVESTING",
        weather: "晴れ",
        thingIds: [anotherThingId],
      });

      await repo.create(testMembership, {
        date: "2025-06-15",
        title: "除草作業",
        content: "雑草を除去しました。",
        workType: "WEEDING",
        weather: "雨",
        thingIds: [],
      });
    });

    it("テキスト内容で検索できる", async () => {
      // Arrange
      const input: SearchDiariesInput = {
        limit: 10,
        offset: 0,
        search: "トマト",
        sortBy: "date",
        sortOrder: "desc",
      };

      // Act
      const result = await repo.search(testOrganizationId, input);

      // Assert
      expect(result.diaries).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.diaries.some((d) => d.title === "トマト植え付け")).toBe(true);
      expect(result.diaries.some((d) => d.title === "水やり作業")).toBe(true);
    });

    it("作業種別で検索できる", async () => {
      // Arrange
      const input: SearchDiariesInput = {
        limit: 10,
        offset: 0,
        workTypes: ["PLANTING", "HARVESTING"],
        sortBy: "date",
        sortOrder: "desc",
      };

      // Act
      const result = await repo.search(testOrganizationId, input);

      // Assert
      expect(result.diaries).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.diaries.some((d) => d.workType === "PLANTING")).toBe(true);
      expect(result.diaries.some((d) => d.workType === "HARVESTING")).toBe(true);
    });

    it("日付範囲で検索できる", async () => {
      // Arrange
      const input: SearchDiariesInput = {
        limit: 10,
        offset: 0,
        dateFrom: "2025-06-05",
        dateTo: "2025-06-10",
        sortBy: "date",
        sortOrder: "desc",
      };

      // Act
      const result = await repo.search(testOrganizationId, input);

      // Assert
      expect(result.diaries).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(
        result.diaries.every(
          (d) => d.date >= "2025-06-05" && d.date <= "2025-06-10"
        )
      ).toBe(true);
    });

    it("ほ場IDで検索できる", async () => {
      // Arrange
      const anotherThingId = "another-thing-id";
      const input: SearchDiariesInput = {
        limit: 10,
        offset: 0,
        thingIds: [anotherThingId],
        sortBy: "date",
        sortOrder: "desc",
      };

      // Act
      const result = await repo.search(testOrganizationId, input);

      // Assert
      expect(result.diaries).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.diaries.some((d) => d.title === "水やり作業")).toBe(true);
      expect(result.diaries.some((d) => d.title === "収穫作業")).toBe(true);
    });

    it("天気で検索できる", async () => {
      // Arrange
      const input: SearchDiariesInput = {
        limit: 10,
        offset: 0,
        weather: ["晴れ"],
        sortBy: "date",
        sortOrder: "desc",
      };

      // Act
      const result = await repo.search(testOrganizationId, input);

      // Assert
      expect(result.diaries).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.diaries.every((d) => d.weather === "晴れ")).toBe(true);
    });

    it("複数の検索条件を組み合わせできる", async () => {
      // Arrange
      const input: SearchDiariesInput = {
        limit: 10,
        offset: 0,
        search: "トマト",
        workTypes: ["PLANTING"],
        weather: ["晴れ"],
        sortBy: "date",
        sortOrder: "desc",
      };

      // Act
      const result = await repo.search(testOrganizationId, input);

      // Assert
      expect(result.diaries).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.diaries[0]?.title).toBe("トマト植え付け");
    });

    it("ページネーションが正しく動作する", async () => {
      // Arrange
      const page1Input: SearchDiariesInput = {
        limit: 2,
        offset: 0,
        sortBy: "date",
        sortOrder: "desc",
      };

      // Act
      const page1 = await repo.search(testOrganizationId, page1Input);

      // Assert
      expect(page1.diaries).toHaveLength(2);
      expect(page1.total).toBe(4);
      expect(page1.hasNext).toBe(true);

      // 2ページ目
      const page2Input: SearchDiariesInput = {
        limit: 2,
        offset: 2,
        sortBy: "date",
        sortOrder: "desc",
      };

      const page2 = await repo.search(testOrganizationId, page2Input);
      expect(page2.diaries).toHaveLength(2);
      expect(page2.total).toBe(4);
      expect(page2.hasNext).toBe(false);
    });

    it("存在しないほ場IDで空の結果を返す", async () => {
      // Arrange
      const input: SearchDiariesInput = {
        limit: 10,
        offset: 0,
        thingIds: ["non-existent-thing-id"],
        sortBy: "date",
        sortOrder: "desc",
      };

      // Act
      const result = await repo.search(testOrganizationId, input);

      // Assert
      expect(result.diaries).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasNext).toBe(false);
    });
  });

  describe("update", () => {
    it("日誌フィールドを更新できる", async () => {
      // Arrange
      const input: CreateDiaryInput = {
        date: "2025-06-05",
        content: "元の内容",
        workType: "PLANTING",
        thingIds: [testThingId],
      };

      const createdDiary = await repo.create(testMembership, input);

      const updateInput: UpdateDiaryInput = {
        title: "更新されたタイトル",
        content: "更新された内容",
        workType: "HARVESTING",
        duration: 4.0,
        temperature: 28.0,
      };

      // Act
      const result = await repo.update(
        { diaryId: createdDiary.id, organizationId: testOrganizationId },
        updateInput
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.title).toBe(updateInput.title);
      expect(result.content).toBe(updateInput.content);
      expect(result.workType).toBe(updateInput.workType);
      expect(result.duration).toBe(updateInput.duration);
      expect(result.temperature).toBe(updateInput.temperature);
      expect(result.date).toBe(input.date); // 変更されていない
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it("ほ場関連付けを更新できる", async () => {
      // Arrange
      const input: CreateDiaryInput = {
        date: "2025-06-05",
        content: "テスト日誌",
        workType: "WEEDING",
        thingIds: [testThingId],
      };

      const createdDiary = await repo.create(testMembership, input);

      // 新しいthingを作成
      const newThingId = "new-thing-id";
      await db.insert(thingsTable).values({
        id: newThingId,
        name: "New Field",
        type: "field",
        organizationId: testOrganizationId,
      });

      const updateInput: UpdateDiaryInput = {
        content: "更新された内容",
        thingIds: [newThingId],
      };

      // Act
      await repo.update(
        { diaryId: createdDiary.id, organizationId: testOrganizationId },
        updateInput
      );

      // Assert
      // 関連付けが更新されているか確認
      const diaryThings = await db
        .select()
        .from(diaryThingsTable)
        .where(eq(diaryThingsTable.diaryId, createdDiary.id));

      expect(diaryThings).toHaveLength(1);
      expect(diaryThings[0]?.thingId).toBe(newThingId);
    });

    it("無効なthingId権限で更新時にエラーを投げる", async () => {
      // Arrange
      const input: CreateDiaryInput = {
        date: "2025-06-05",
        content: "テスト日誌",
        workType: "FERTILIZING",
        thingIds: [testThingId],
      };

      const createdDiary = await repo.create(testMembership, input);

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

      const updateInput: UpdateDiaryInput = {
        content: "更新内容",
        thingIds: [otherThingId], // 異なる組織のほ場ID
      };

      // Act & Assert
      await expect(
        repo.update(
          { diaryId: createdDiary.id, organizationId: testOrganizationId },
          updateInput
        )
      ).rejects.toThrow(DashboardDBError);
      await expect(
        repo.update(
          { diaryId: createdDiary.id, organizationId: testOrganizationId },
          updateInput
        )
      ).rejects.toThrow(
        "指定されたほ場ID [other-thing-id] は存在しないか、この組織に属していません"
      );
    });

    it("存在しないthingIdで更新時にエラーを投げる", async () => {
      // Arrange
      const input: CreateDiaryInput = {
        date: "2025-06-05",
        content: "テスト日誌",
        workType: "WATERING",
        thingIds: [testThingId],
      };

      const createdDiary = await repo.create(testMembership, input);

      const updateInput: UpdateDiaryInput = {
        content: "更新内容",
        thingIds: ["non-existent-thing-id"],
      };

      // Act & Assert
      await expect(
        repo.update(
          { diaryId: createdDiary.id, organizationId: testOrganizationId },
          updateInput
        )
      ).rejects.toThrow(DashboardDBError);
      await expect(
        repo.update(
          { diaryId: createdDiary.id, organizationId: testOrganizationId },
          updateInput
        )
      ).rejects.toThrow(
        "指定されたほ場ID [non-existent-thing-id] は存在しないか、この組織に属していません"
      );
    });

    it("空のthingIdsで更新できる", async () => {
      // Arrange
      const input: CreateDiaryInput = {
        date: "2025-06-05",
        content: "テスト日誌",
        workType: "PRUNING",
        thingIds: [testThingId],
      };

      const createdDiary = await repo.create(testMembership, input);

      const updateInput: UpdateDiaryInput = {
        content: "更新内容",
        thingIds: [],
      };

      // Act
      const result = await repo.update(
        { diaryId: createdDiary.id, organizationId: testOrganizationId },
        updateInput
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.content).toBe(updateInput.content);

      // 関連付けが削除されているか確認
      const diaryThings = await db
        .select()
        .from(diaryThingsTable)
        .where(eq(diaryThingsTable.diaryId, createdDiary.id));

      expect(diaryThings).toHaveLength(0);
    });

    it("存在しない日誌の更新でエラーを投げる", async () => {
      // Arrange
      const updateInput: UpdateDiaryInput = {
        content: "更新内容",
        thingIds: [testThingId],
      };

      // Act & Assert
      await expect(
        repo.update(
          { diaryId: "non-existent-id", organizationId: testOrganizationId },
          updateInput
        )
      ).rejects.toThrow(DashboardDBError);
    });
  });

  describe("delete", () => {
    it("日誌と関連付けを削除できる", async () => {
      // Arrange
      const input: CreateDiaryInput = {
        date: "2025-06-05",
        content: "削除予定の日誌",
        workType: "OTHER",
        thingIds: [testThingId],
      };

      const createdDiary = await repo.create(testMembership, input);

      // Act
      const result = await repo.delete({
        diaryId: createdDiary.id,
        organizationId: testOrganizationId,
      });

      // Assert
      expect(result).toBe(true);

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

    it("存在しない日誌の削除でfalseを返す", async () => {
      // Act
      const result = await repo.delete({
        diaryId: "non-existent-id",
        organizationId: testOrganizationId,
      });

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("getDailyDigestData", () => {
    it("should return empty digest data when no entries exist", async () => {
      const targetDate = "2025-06-24";
      const result = await repo.getDailyDigestData(testOrganizationId, targetDate);

      // 結果の検証
      expect(result).toEqual({
        date: targetDate,
        totalEntries: 0,
        totalDuration: 0,
        totalFields: 0,
        workTypeSummary: [],
        fieldSummary: [],
        recentEntries: [],
      });
    });

    it("should return correct digest data with diary entries", async () => {
      // テストデータを作成
      const testFieldId1 = "test-field-1";
      const testFieldId2 = "test-field-2";
      const targetDate = "2025-06-24";

      await db.insert(thingsTable).values([
        {
          id: testFieldId1,
          name: "Field A",
          type: "field",
          organizationId: testOrganizationId,
        },
        {
          id: testFieldId2,
          name: "Field B",
          type: "field",
          organizationId: testOrganizationId,
        },
      ]);

      // 日誌エントリを作成
      const diaryEntries = [
        {
          id: "diary-1",
          date: targetDate,
          title: "播種作業",
          content: "ニンジンの播種を行いました",
          workType: "SEEDING",
          duration: 2.5,
          userId: testUserId,
          organizationId: testOrganizationId,
          createdAt: new Date("2025-06-24T08:00:00Z"),
          updatedAt: new Date("2025-06-24T08:00:00Z"),
        },
        {
          id: "diary-2",
          date: targetDate,
          title: "除草作業",
          content: "Field Bの除草作業",
          workType: "WEEDING",
          duration: 1.5,
          userId: testUserId,
          organizationId: testOrganizationId,
          createdAt: new Date("2025-06-24T10:00:00Z"),
          updatedAt: new Date("2025-06-24T10:00:00Z"),
        },
        {
          id: "diary-3",
          date: targetDate,
          title: "播種作業2",
          content: "大根の播種",
          workType: "SEEDING",
          duration: 1.0,
          userId: testUserId,
          organizationId: testOrganizationId,
          createdAt: new Date("2025-06-24T14:00:00Z"),
          updatedAt: new Date("2025-06-24T14:00:00Z"),
        },
      ];

      await db.insert(diariesTable).values(diaryEntries);

      // 日誌とほ場の関連を作成
      await db.insert(diaryThingsTable).values([
        { diaryId: "diary-1", thingId: testFieldId1 },
        { diaryId: "diary-2", thingId: testFieldId2 },
        { diaryId: "diary-3", thingId: testFieldId1 },
      ]);

      const result = await repo.getDailyDigestData(testOrganizationId, targetDate);

      // 基本統計の検証
      expect(result.date).toBe(targetDate);
      expect(result.totalEntries).toBe(3);
      expect(result.totalDuration).toBe(5.0); // 2.5 + 1.5 + 1.0
      expect(result.totalFields).toBe(2);

      // 作業種別サマリーの検証
      expect(result.workTypeSummary).toHaveLength(2);

      const seedingWork = result.workTypeSummary.find(
        (w) => w.workType === "SEEDING"
      );
      expect(seedingWork).toBeDefined();
      expect(seedingWork?.count).toBe(2);
      expect(seedingWork?.totalDuration).toBe(3.5); // 2.5 + 1.0

      const weedingWork = result.workTypeSummary.find(
        (w) => w.workType === "WEEDING"
      );
      expect(weedingWork).toBeDefined();
      expect(weedingWork?.count).toBe(1);
      expect(weedingWork?.totalDuration).toBe(1.5);

      // ほ場別サマリーの検証
      expect(result.fieldSummary).toHaveLength(2);

      const fieldA = result.fieldSummary.find((f) => f.fieldName === "Field A");
      expect(fieldA).toBeDefined();
      expect(fieldA?.totalDuration).toBe(3.5); // diary-1: 2.5 + diary-3: 1.0

      const fieldB = result.fieldSummary.find((f) => f.fieldName === "Field B");
      expect(fieldB).toBeDefined();
      expect(fieldB?.totalDuration).toBe(1.5); // diary-2: 1.5

      // 最新エントリの検証（作成日時順）
      expect(result.recentEntries).toHaveLength(3);
      expect(result.recentEntries[0]?.id).toBe("diary-3"); // 最新（14:00）
      expect(result.recentEntries[1]?.id).toBe("diary-2"); // 中間（10:00）
      expect(result.recentEntries[2]?.id).toBe("diary-1"); // 最古（08:00）

      // エントリの詳細情報の検証
      const latestEntry = result.recentEntries[0];
      expect(latestEntry?.title).toBe("播種作業2");
      expect(latestEntry?.workType).toBe("SEEDING");
      expect(latestEntry?.duration).toBe(1.0);
      expect(latestEntry?.userName).toBe("Test User");
      expect(latestEntry?.fieldNames).toEqual(["Field A"]);
    });

    it("should handle entries without user information", async () => {
      // テストデータを作成
      const testFieldId = "test-field-1";
      const targetDate = "2025-06-24";

      await db.insert(thingsTable).values({
        id: testFieldId,
        name: "Test Field",
        type: "field",
        organizationId: testOrganizationId,
      });

      // ユーザー情報なしの日誌エントリを作成
      await db.insert(diariesTable).values({
        id: "diary-no-user",
        date: targetDate,
        title: "無名作業",
        content: "ユーザー情報なし",
        workType: "SEEDING",
        duration: 1.0,
        userId: null, // ユーザー情報なし
        organizationId: testOrganizationId,
        createdAt: new Date("2025-06-24T10:00:00Z"),
        updatedAt: new Date("2025-06-24T10:00:00Z"),
      });

      await db.insert(diaryThingsTable).values({
        diaryId: "diary-no-user",
        thingId: testFieldId,
      });

      const result = await repo.getDailyDigestData(testOrganizationId, targetDate);

      // 結果の検証
      expect(result.totalEntries).toBe(1);
      expect(result.recentEntries).toHaveLength(1);
      expect(result.recentEntries[0]?.userName).toBeNull();
      expect(result.recentEntries[0]?.title).toBe("無名作業");
    });

    it("should filter entries by organization and date", async () => {
      // 複数の組織と日付でテストデータを作成
      const testOrgId2 = "test-org-2";
      const testFieldId = "test-field-1";
      const targetDate = "2025-06-24";
      const otherDate = "2025-06-25";

      // 基本データを挿入
      await db.insert(organizationsTable).values({
        id: testOrgId2,
        name: "Organization 2",
      });

      await db.insert(thingsTable).values({
        id: testFieldId,
        name: "Test Field",
        type: "field",
        organizationId: testOrganizationId,
      });

      // 異なる組織・日付の日誌エントリを作成
      await db.insert(diariesTable).values([
        {
          id: "diary-target",
          date: targetDate,
          title: "対象の作業",
          content: "対象の作業内容",
          workType: "SEEDING",
          duration: 2.0,
          userId: testUserId,
          organizationId: testOrganizationId, // 対象組織
          createdAt: new Date("2025-06-24T10:00:00Z"),
          updatedAt: new Date("2025-06-24T10:00:00Z"),
        },
        {
          id: "diary-other-org",
          date: targetDate,
          title: "他組織の作業",
          content: "他組織の作業内容",
          workType: "WEEDING",
          duration: 1.0,
          userId: testUserId,
          organizationId: testOrgId2, // 他組織
          createdAt: new Date("2025-06-24T11:00:00Z"),
          updatedAt: new Date("2025-06-24T11:00:00Z"),
        },
        {
          id: "diary-other-date",
          date: otherDate,
          title: "他日付の作業",
          content: "他日付の作業内容",
          workType: "HARVESTING",
          duration: 3.0,
          userId: testUserId,
          organizationId: testOrganizationId, // 対象組織だが他日付
          createdAt: new Date("2025-06-25T10:00:00Z"),
          updatedAt: new Date("2025-06-25T10:00:00Z"),
        },
      ]);

      await db.insert(diaryThingsTable).values({
        diaryId: "diary-target",
        thingId: testFieldId,
      });

      const result = await repo.getDailyDigestData(testOrganizationId, targetDate);

      // 対象組織・対象日付のエントリのみ取得されることを確認
      expect(result.totalEntries).toBe(1);
      expect(result.totalDuration).toBe(2.0);
      expect(result.recentEntries).toHaveLength(1);
      expect(result.recentEntries[0]?.id).toBe("diary-target");
      expect(result.recentEntries[0]?.title).toBe("対象の作業");
    });
  });
});
