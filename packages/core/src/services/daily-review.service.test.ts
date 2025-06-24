import { describe, it, beforeEach, expect, vi } from "vitest";
import { dbClient } from "@repo/db/client";
import {
  organizationsTable,
  usersTable,
  diariesTable,
  thingsTable,
  diaryThingsTable,
} from "@repo/db/schema";
import {
  getDailyDigestData,
  generateDailyDigestMessage,
  sendDailyDigest,
  formatDuration,
  type DailyDigestData,
} from "./daily-review.service";
import { type OrganizationWithNotification } from "./organization.service";
import * as discordService from "./discord.service";

const db = dbClient();

describe("DailyReviewService", () => {
  beforeEach(async () => {
    // テスト用のデータベースをリセット
    await db.transaction(async (tx) => {
      await tx.delete(diaryThingsTable);
      await tx.delete(diariesTable);
      await tx.delete(thingsTable);
      await tx.delete(usersTable);
      await tx.delete(organizationsTable);
    });
  });

  describe("getDailyDigestData", () => {
    it("should return empty digest data when no entries exist", async () => {
      // 組織を作成
      await db.insert(organizationsTable).values({
        id: "test-org-id",
        name: "Test Organization",
      });

      const targetDate = "2025-06-24";
      const result = await getDailyDigestData(db, "test-org-id", targetDate);

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
      const testUserId = "test-user-id";
      const testOrgId = "test-org-id";
      const testFieldId1 = "test-field-1";
      const testFieldId2 = "test-field-2";
      const targetDate = "2025-06-24";

      // 基本データを挿入
      await db.insert(organizationsTable).values({
        id: testOrgId,
        name: "Test Organization",
      });

      await db.insert(usersTable).values({
        id: testUserId,
        name: "Test User",
      });

      await db.insert(thingsTable).values([
        {
          id: testFieldId1,
          name: "Field A",
          type: "FIELD",
          organizationId: testOrgId,
        },
        {
          id: testFieldId2,
          name: "Field B",
          type: "FIELD",
          organizationId: testOrgId,
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
          organizationId: testOrgId,
          createdAt: new Date("2025-06-24T08:00:00Z"),
        },
        {
          id: "diary-2",
          date: targetDate,
          title: "除草作業",
          content: "Field Bの除草作業",
          workType: "WEEDING",
          duration: 1.5,
          userId: testUserId,
          organizationId: testOrgId,
          createdAt: new Date("2025-06-24T10:00:00Z"),
        },
        {
          id: "diary-3",
          date: targetDate,
          title: "播種作業2",
          content: "大根の播種",
          workType: "SEEDING",
          duration: 1.0,
          userId: testUserId,
          organizationId: testOrgId,
          createdAt: new Date("2025-06-24T14:00:00Z"),
        },
      ];

      await db.insert(diariesTable).values(diaryEntries);

      // 日誌とほ場の関連を作成
      await db.insert(diaryThingsTable).values([
        { diaryId: "diary-1", thingId: testFieldId1 },
        { diaryId: "diary-2", thingId: testFieldId2 },
        { diaryId: "diary-3", thingId: testFieldId1 },
      ]);

      const result = await getDailyDigestData(db, testOrgId, targetDate);

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
      const testOrgId = "test-org-id";
      const testFieldId = "test-field-1";
      const targetDate = "2025-06-24";

      // 基本データを挿入
      await db.insert(organizationsTable).values({
        id: testOrgId,
        name: "Test Organization",
      });

      await db.insert(thingsTable).values({
        id: testFieldId,
        name: "Test Field",
        type: "FIELD",
        organizationId: testOrgId,
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
        organizationId: testOrgId,
        createdAt: new Date("2025-06-24T10:00:00Z"),
      });

      await db.insert(diaryThingsTable).values({
        diaryId: "diary-no-user",
        thingId: testFieldId,
      });

      const result = await getDailyDigestData(db, testOrgId, targetDate);

      // 結果の検証
      expect(result.totalEntries).toBe(1);
      expect(result.recentEntries).toHaveLength(1);
      expect(result.recentEntries[0]?.userName).toBeNull();
      expect(result.recentEntries[0]?.title).toBe("無名作業");
    });

    it("should filter entries by organization and date", async () => {
      // 複数の組織と日付でテストデータを作成
      const testUserId = "test-user-id";
      const testOrgId1 = "test-org-1";
      const testOrgId2 = "test-org-2";
      const testFieldId = "test-field-1";
      const targetDate = "2025-06-24";
      const otherDate = "2025-06-25";

      // 基本データを挿入
      await db.insert(organizationsTable).values([
        { id: testOrgId1, name: "Organization 1" },
        { id: testOrgId2, name: "Organization 2" },
      ]);

      await db.insert(usersTable).values({
        id: testUserId,
        name: "Test User",
      });

      await db.insert(thingsTable).values({
        id: testFieldId,
        name: "Test Field",
        type: "FIELD",
        organizationId: testOrgId1,
      });

      // 異なる組織・日付の日誌エントリを作成
      await db.insert(diariesTable).values([
        {
          id: "diary-target",
          date: targetDate,
          title: "対象の作業",
          workType: "SEEDING",
          duration: 2.0,
          userId: testUserId,
          organizationId: testOrgId1, // 対象組織
          createdAt: new Date("2025-06-24T10:00:00Z"),
        },
        {
          id: "diary-other-org",
          date: targetDate,
          title: "他組織の作業",
          workType: "WEEDING",
          duration: 1.0,
          userId: testUserId,
          organizationId: testOrgId2, // 他組織
          createdAt: new Date("2025-06-24T11:00:00Z"),
        },
        {
          id: "diary-other-date",
          date: otherDate,
          title: "他日付の作業",
          workType: "HARVESTING",
          duration: 3.0,
          userId: testUserId,
          organizationId: testOrgId1, // 対象組織だが他日付
          createdAt: new Date("2025-06-25T10:00:00Z"),
        },
      ]);

      await db.insert(diaryThingsTable).values({
        diaryId: "diary-target",
        thingId: testFieldId,
      });

      const result = await getDailyDigestData(db, testOrgId1, targetDate);

      // 対象組織・対象日付のエントリのみ取得されることを確認
      expect(result.totalEntries).toBe(1);
      expect(result.totalDuration).toBe(2.0);
      expect(result.recentEntries).toHaveLength(1);
      expect(result.recentEntries[0]?.id).toBe("diary-target");
      expect(result.recentEntries[0]?.title).toBe("対象の作業");
    });
  });

  describe("formatDuration", () => {
    it("should format 0 hours correctly", () => {
      expect(formatDuration(0)).toBe("0 h");
    });

    it("should format exact hours without minutes", () => {
      expect(formatDuration(1)).toBe("1 h");
      expect(formatDuration(2)).toBe("2 h");
      expect(formatDuration(8)).toBe("8 h");
    });

    it("should format minutes only when less than 1 hour", () => {
      expect(formatDuration(0.25)).toBe("15 m"); // 0.25 * 60 = 15
      expect(formatDuration(0.5)).toBe("30 m");
      expect(formatDuration(0.75)).toBe("45 m");
    });

    it("should format hours and minutes correctly", () => {
      expect(formatDuration(1.25)).toBe("1 h 15 m");
      expect(formatDuration(2.5)).toBe("2 h 30 m");
      expect(formatDuration(3.75)).toBe("3 h 45 m");
    });

    it("should round minutes to nearest integer", () => {
      expect(formatDuration(1.166666)).toBe("1 h 10 m"); // 1.166666 * 60 = 10分
      expect(formatDuration(2.333333)).toBe("2 h 20 m"); // 0.333333 * 60 = 20分
    });

    it("should handle decimal hours correctly", () => {
      expect(formatDuration(0.1)).toBe("6 m"); // 0.1 * 60 = 6
      expect(formatDuration(1.1)).toBe("1 h 6 m");
    });
  });

  describe("generateDailyDigestMessage", () => {
    it("should generate message for empty data", () => {
      const emptyData: DailyDigestData = {
        date: "2025-06-24",
        totalEntries: 0,
        totalDuration: 0,
        totalFields: 0,
        workTypeSummary: [],
        fieldSummary: [],
        recentEntries: [],
      };

      const message = generateDailyDigestMessage(emptyData);

      expect(message).toContain("🌅 日次ダイジェスト | 2025-06-24 (火)");
      expect(message).toContain("作業件数 0 | 総作業時間 0 h | ほ場 0");
      expect(message).toContain("作業記録なし");
      expect(message).toContain(
        "🔗 詳細を開く -> https://dashboard.example.com/logs?date=2025-06-24"
      );
    });

    it("should generate message with work type summary", () => {
      const testData: DailyDigestData = {
        date: "2025-06-24",
        totalEntries: 3,
        totalDuration: 5.5,
        totalFields: 2,
        workTypeSummary: [
          { workType: "SEEDING", count: 2, totalDuration: 3.5 },
          { workType: "WEEDING", count: 1, totalDuration: 2.0 },
        ],
        fieldSummary: [
          { fieldName: "Field A", totalDuration: 3.5 },
          { fieldName: "Field B", totalDuration: 2.0 },
        ],
        recentEntries: [],
      };

      const message = generateDailyDigestMessage(testData);

      expect(message).toContain("作業件数 3 | 総作業時間 5 h 30 m | ほ場 2");
      expect(message).toContain("🌱 SEEDING 2 (3 h 30 m)");
      expect(message).toContain("🍃 WEEDING 1 (2 h)");
      expect(message).toContain("Field A: 3 h 30 m");
      expect(message).toContain("Field B: 2 h");
    });

    it("should include field summary only for multiple fields", () => {
      const singleFieldData: DailyDigestData = {
        date: "2025-06-24",
        totalEntries: 1,
        totalDuration: 2.0,
        totalFields: 1,
        workTypeSummary: [
          { workType: "SEEDING", count: 1, totalDuration: 2.0 },
        ],
        fieldSummary: [{ fieldName: "Field A", totalDuration: 2.0 }],
        recentEntries: [],
      };

      const message = generateDailyDigestMessage(singleFieldData);

      // 単一ほ場の場合はほ場別サマリーを表示しない
      expect(message).not.toContain("**ほ場別作業時間:**");
      expect(message).not.toContain("Field A: 2 h");
    });

    it("should include recent entries with proper formatting", () => {
      const testData: DailyDigestData = {
        date: "2025-06-24",
        totalEntries: 2,
        totalDuration: 3.0,
        totalFields: 1,
        workTypeSummary: [
          { workType: "SEEDING", count: 2, totalDuration: 3.0 },
        ],
        fieldSummary: [{ fieldName: "Test Field", totalDuration: 3.0 }],
        recentEntries: [
          {
            id: "entry-1",
            title: "ニンジン播種",
            workType: "SEEDING",
            duration: 2.0,
            userName: "Test User",
            fieldNames: ["Test Field"],
            createdAt: new Date("2025-06-24T08:00:00Z"),
          },
          {
            id: "entry-2",
            title: null,
            workType: "WEEDING",
            duration: 1.0,
            userName: null,
            fieldNames: [],
            createdAt: new Date("2025-06-24T10:00:00Z"),
          },
        ],
      };

      const message = generateDailyDigestMessage(testData);

      expect(message).toContain("**作業明細:**");
      expect(message).toContain("17:00 Test Field 🌱 ニンジン播種"); // UTC+9の時間
      expect(message).toContain("19:00 未指定 🍃 WEEDING");
    });

    it("should handle entry without title by using workType", () => {
      const testData: DailyDigestData = {
        date: "2025-06-24",
        totalEntries: 1,
        totalDuration: 1.0,
        totalFields: 1,
        workTypeSummary: [
          { workType: "SEEDING", count: 1, totalDuration: 1.0 },
        ],
        fieldSummary: [{ fieldName: "Test Field", totalDuration: 1.0 }],
        recentEntries: [
          {
            id: "entry-1",
            title: null,
            workType: null,
            duration: 1.0,
            userName: "Test User",
            fieldNames: ["Test Field"],
            createdAt: new Date("2025-06-24T08:00:00Z"),
          },
        ],
      };

      const message = generateDailyDigestMessage(testData);

      expect(message).toContain("17:00 Test Field 📝 作業記録"); // workType=nullの場合のフォールバック
    });
  });

  describe("sendDailyDigest", () => {
    beforeEach(() => {
      // discordService.sendMessageViaWebhookをモック
      vi.clearAllMocks();
      vi.spyOn(discordService, "sendMessageViaWebhook").mockResolvedValue(
        undefined // 実際の実装では成功時にundefinedまたはJSON objectを返す
      );
    });

    it("should send digest to all channels successfully", async () => {
      const testUserId = "test-user-id";
      const testOrgId = "test-org-id";
      const testFieldId = "test-field-1";
      const targetDate = "2025-06-24";

      // テストデータをセットアップ
      await db.insert(organizationsTable).values({
        id: testOrgId,
        name: "Test Organization",
      });

      await db.insert(usersTable).values({
        id: testUserId,
        name: "Test User",
      });

      await db.insert(thingsTable).values({
        id: testFieldId,
        name: "Test Field",
        type: "FIELD",
        organizationId: testOrgId,
      });

      await db.insert(diariesTable).values({
        id: "test-diary",
        date: targetDate,
        title: "Test Work",
        workType: "SEEDING",
        duration: 2.0,
        userId: testUserId,
        organizationId: testOrgId,
        createdAt: new Date("2025-06-24T08:00:00Z"),
      });

      await db.insert(diaryThingsTable).values({
        diaryId: "test-diary",
        thingId: testFieldId,
      });

      const organization: OrganizationWithNotification = {
        organizationId: testOrgId,
        organizationName: "Test Organization",
        channels: [
          {
            channelId: "channel-1",
            channelName: "general",
            notificationSettings: {
              daily: true,
              weekly: false,
              monthly: false,
            },
          },
          {
            channelId: "channel-2",
            channelName: "notifications",
            notificationSettings: { daily: true, weekly: true, monthly: false },
          },
        ],
      };

      const result = await sendDailyDigest(db, organization, targetDate);

      // 結果の検証
      expect(result.success).toBe(true);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(result.message).toContain(
        `日次ダイジェストを送信しました（${targetDate}）`
      );
      expect(result.message).toContain("成功 2件、失敗 0件");

      // sendMessageViaWebhookが正しく呼ばれたことを確認
      expect(discordService.sendMessageViaWebhook).toHaveBeenCalledTimes(2);
      expect(discordService.sendMessageViaWebhook).toHaveBeenCalledWith(
        db,
        "channel-1",
        expect.objectContaining({
          content: expect.stringContaining("🌅 日次ダイジェスト"),
        })
      );
      expect(discordService.sendMessageViaWebhook).toHaveBeenCalledWith(
        db,
        "channel-2",
        expect.objectContaining({
          content: expect.stringContaining("🌅 日次ダイジェスト"),
        })
      );
    });

    it("should handle partial failures correctly", async () => {
      // 一つのチャンネルで失敗するケースをモック
      vi.spyOn(discordService, "sendMessageViaWebhook")
        .mockResolvedValueOnce(undefined) // 1つ目は成功
        .mockRejectedValueOnce(new Error("Discord API error")); // 2つ目は失敗

      const testOrgId = "test-org-id";
      const targetDate = "2025-06-24";

      // 最小限のテストデータ
      await db.insert(organizationsTable).values({
        id: testOrgId,
        name: "Test Organization",
      });

      const organization: OrganizationWithNotification = {
        organizationId: testOrgId,
        organizationName: "Test Organization",
        channels: [
          {
            channelId: "channel-success",
            channelName: "general",
            notificationSettings: {
              daily: true,
              weekly: false,
              monthly: false,
            },
          },
          {
            channelId: "channel-fail",
            channelName: "notifications",
            notificationSettings: { daily: true, weekly: true, monthly: false },
          },
        ],
      };

      const result = await sendDailyDigest(db, organization, targetDate);

      // 結果の検証
      expect(result.success).toBe(false);
      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
      expect(result.message).toContain("成功 1件、失敗 1件");
    });

    it("should handle webhook failures", async () => {
      // sendMessageViaWebhookが例外をスローするケースをテスト
      vi.spyOn(discordService, "sendMessageViaWebhook").mockRejectedValue(
        new Error("Discord API completely down")
      );

      const testOrgId = "test-org-id";
      const targetDate = "2025-06-24";

      // 組織を作成（データベースエラーを避けるため）
      await db.insert(organizationsTable).values({
        id: testOrgId,
        name: "Test Organization",
      });

      const organization: OrganizationWithNotification = {
        organizationId: testOrgId,
        organizationName: "Test Organization",
        channels: [
          {
            channelId: "channel-1",
            channelName: "general",
            notificationSettings: {
              daily: true,
              weekly: false,
              monthly: false,
            },
          },
        ],
      };

      const result = await sendDailyDigest(db, organization, targetDate);

      // エラーハンドリングの検証
      expect(result.success).toBe(false);
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(1);
      // Promise.allSettledで処理されるため、errorプロパティは設定されない
    });

    it("should generate correct digest message content", async () => {
      const testUserId = "test-user-id";
      const testOrgId = "test-org-id";
      const testFieldId = "test-field-1";
      const targetDate = "2025-06-24";

      // テストデータをセットアップ
      await db.insert(organizationsTable).values({
        id: testOrgId,
        name: "Test Organization",
      });

      await db.insert(usersTable).values({
        id: testUserId,
        name: "Test User",
      });

      await db.insert(thingsTable).values({
        id: testFieldId,
        name: "Test Field",
        type: "FIELD",
        organizationId: testOrgId,
      });

      await db.insert(diariesTable).values({
        id: "test-diary",
        date: targetDate,
        title: "Test Seeding Work",
        workType: "SEEDING",
        duration: 2.5,
        userId: testUserId,
        organizationId: testOrgId,
        createdAt: new Date("2025-06-24T08:00:00Z"),
      });

      await db.insert(diaryThingsTable).values({
        diaryId: "test-diary",
        thingId: testFieldId,
      });

      const organization: OrganizationWithNotification = {
        organizationId: testOrgId,
        organizationName: "Test Organization",
        channels: [
          {
            channelId: "channel-1",
            channelName: "general",
            notificationSettings: {
              daily: true,
              weekly: false,
              monthly: false,
            },
          },
        ],
      };

      await sendDailyDigest(db, organization, targetDate);

      // 送信されたメッセージの内容を確認
      const sentMessage = vi.mocked(discordService.sendMessageViaWebhook).mock
        .calls[0]?.[2];
      expect(sentMessage?.content).toContain(
        "🌅 日次ダイジェスト | 2025-06-24 (火)"
      );
      expect(sentMessage?.content).toContain(
        "作業件数 1 | 総作業時間 2 h 30 m | ほ場 1"
      );
      expect(sentMessage?.content).toContain("🌱 SEEDING 1 (2 h 30 m)");
      expect(sentMessage?.content).toContain(
        "17:00 Test Field 🌱 Test Seeding Work"
      );
    });

    it("should handle exception in try block", async () => {
      // getDailyDigestDataで例外が発生するケースをテスト（データベース接続エラーなど）
      // 無効なDBオブジェクトを渡してエラーを発生させる
      const invalidDb = null as unknown as typeof db;

      const organization: OrganizationWithNotification = {
        organizationId: "test-org-id",
        organizationName: "Test Organization",
        channels: [
          {
            channelId: "channel-1",
            channelName: "general",
            notificationSettings: {
              daily: true,
              weekly: false,
              monthly: false,
            },
          },
        ],
      };

      const result = await sendDailyDigest(
        invalidDb,
        organization,
        "2025-06-24"
      );

      // エラーハンドリングの検証（catch blockでの処理）
      expect(result.success).toBe(false);
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(1);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe("string");
    });
  });
});
