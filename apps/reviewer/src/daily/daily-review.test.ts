import { describe, it, expect } from "vitest";
import { generateDailyDigestMessage, formatDuration } from "./daily-review";
import { WORK_TYPE_OPTIONS } from "@repo/config";
import { DailyDigestData } from "@repo/dashboard-db/interfaces";

describe("DailyReviewService", () => {
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

      const result = generateDailyDigestMessage(emptyData);

      expect(result.embeds).toHaveLength(1);
      const embed = result.embeds![0]!;
      expect(embed.title).toContain("🌅 日次ダイジェスト");
      expect(embed.description).toContain("作業件数:");
      expect(embed.description).toContain("0");
      expect(embed.description).toContain("総作業時間:");
      expect(embed.description).toContain("0 h");
      expect(embed.description).toContain("ほ場:");
      expect(embed.description).toContain("0");
      expect(embed.fields).toEqual([]);
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

      const result = generateDailyDigestMessage(testData);

      expect(result.embeds).toHaveLength(1);
      const embed = result.embeds![0]!;
      expect(embed.description).toContain("作業件数:");
      expect(embed.description).toContain("3");
      expect(embed.description).toContain("総作業時間:");
      expect(embed.description).toContain("5 h 30 m");
      expect(embed.description).toContain("ほ場:");
      expect(embed.description).toContain("2");

      // 作業種別サマリーのフィールドをチェック
      const workTypeSummaryField = embed.fields?.find(
        (f) => f.name === "🗒️ 作業種別サマリー"
      );
      expect(workTypeSummaryField).toBeDefined();
      expect(workTypeSummaryField?.value).toContain(
        `${WORK_TYPE_OPTIONS.SEEDING.label} 2 (3 h 30 m)`
      );
      expect(workTypeSummaryField?.value).toContain(
        `${WORK_TYPE_OPTIONS.WEEDING.label} 1 (2 h)`
      );

      // ほ場別作業時間のフィールドをチェック
      const fieldSummaryField = embed.fields?.find(
        (f) => f.name === "ほ場別作業時間"
      );
      expect(fieldSummaryField).toBeDefined();
      expect(fieldSummaryField?.value).toContain("Field A: 3 h 30 m");
      expect(fieldSummaryField?.value).toContain("Field B: 2 h");
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

      const result = generateDailyDigestMessage(singleFieldData);

      expect(result.embeds).toHaveLength(1);
      const embed = result.embeds![0]!;

      // 単一ほ場の場合はほ場別サマリーを表示しない
      const fieldSummaryField = embed.fields?.find(
        (f) => f.name === "ほ場別作業時間"
      );
      expect(fieldSummaryField).toBeUndefined();
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

      const result = generateDailyDigestMessage(testData);

      expect(result.embeds).toHaveLength(1);
      const embed = result.embeds![0]!;

      const entriesField = embed.fields?.find((f) =>
        f.name.includes("作業明細")
      );
      expect(entriesField).toBeDefined();
      expect(entriesField?.value).toContain("Test Field");
      expect(entriesField?.value).toContain("ニンジン播種");
      expect(entriesField?.value).toContain("未指定");
      expect(entriesField?.value).toContain(WORK_TYPE_OPTIONS.WEEDING.label);
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

      const result = generateDailyDigestMessage(testData);

      expect(result.embeds).toHaveLength(1);
      const embed = result.embeds![0]!;

      const entriesField = embed.fields?.find((f) =>
        f.name.includes("作業明細")
      );
      expect(entriesField).toBeDefined();
      expect(entriesField?.value).toContain("Test Field");
      expect(entriesField?.value).toContain(WORK_TYPE_OPTIONS.OTHER.label);
    });
  });
});
