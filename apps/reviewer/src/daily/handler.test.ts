import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  type MockedFunction,
} from "vitest";
import { dailyReviewHandler } from "./handler";

// @repo/coreのモック
vi.mock("@repo/core", () => ({
  getOrganizationsWithNotification: vi.fn(),
  sendMessageViaWebhook: vi.fn(),
}));

// ./daily-reviewのモック
vi.mock("./daily-review", () => ({
  getDailyDigestData: vi.fn(),
  generateDailyDigestMessage: vi.fn(),
}));

// @repo/dashboard-db/clientのモック
vi.mock("@repo/dashboard-db/client", () => ({
  dbClient: vi.fn(() => ({})), // モックDBオブジェクト
}));

// モジュールをインポート（モック後）
import {
  getOrganizationsWithNotification,
  sendMessageViaWebhook,
} from "@repo/core";
import { getDailyDigestData, generateDailyDigestMessage } from "./daily-review";
import { Database } from "@repo/dashboard-db/client";

const mockGetOrganizationsWithNotification =
  getOrganizationsWithNotification as MockedFunction<
    typeof getOrganizationsWithNotification
  >;
const mockSendMessageViaWebhook = sendMessageViaWebhook as MockedFunction<
  typeof sendMessageViaWebhook
>;
const mockGetDailyDigestData = getDailyDigestData as MockedFunction<
  typeof getDailyDigestData
>;
const mockGenerateDailyDigestMessage =
  generateDailyDigestMessage as MockedFunction<
    typeof generateDailyDigestMessage
  >;

const testEncryptionKey = "test-encryption-key";
const mockDB = {} as Database;
const testDate = new Date("2025-06-24T10:00:00Z").toISOString().split("T")[0]!; // 2025-06-24

describe("Daily Review Handler", () => {
  beforeEach(() => {
    // モック関数をリセット
    vi.clearAllMocks();

    // 追加の関数のデフォルトモック
    mockGetDailyDigestData.mockResolvedValue({
      date: "2025-06-23",
      totalEntries: 1,
      totalDuration: 60,
      totalFields: 1,
      workTypeSummary: [],
      fieldSummary: [],
      recentEntries: [],
    });

    mockGenerateDailyDigestMessage.mockReturnValue({
      embeds: [{ title: "Daily Digest", description: "Test message" }],
    });

    // console.logをモック（テスト出力を綺麗にするため）
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should return success when no organizations have daily notification enabled", async () => {
    // 空の組織リストを返すようにモック
    mockGetOrganizationsWithNotification.mockResolvedValue([]);

    const result = await dailyReviewHandler(
      mockDB,
      testEncryptionKey,
      testDate
    );

    // getOrganizationsWithNotificationが正しく呼ばれることを確認
    expect(mockGetOrganizationsWithNotification).toHaveBeenCalledWith(
      mockDB,
      "daily"
    );

    // sendDailyDigestは呼ばれないことを確認
    expect(mockSendMessageViaWebhook).not.toHaveBeenCalled();

    // 戻り値の確認
    expect(result).toEqual({
      message: "日次通知が有効な組織がありません",
      processedCount: 0,
    });
  });

  it("should process organizations successfully", async () => {
    const mockOrganizations = [
      {
        organizationId: "org-1",
        organizationName: "Organization 1",
        channels: [
          {
            channelUuid: "channel-1",
            channelName: "general",
            notificationSettings: {
              daily: true,
              weekly: false,
              monthly: false,
            },
          },
        ],
      },
      {
        organizationId: "org-2",
        organizationName: "Organization 2",
        channels: [
          {
            channelUuid: "channel-2",
            channelName: "notifications",
            notificationSettings: { daily: true, weekly: true, monthly: false },
          },
        ],
      },
    ];

    const mockSendResult = {
      success: true,
      successCount: 1,
      failureCount: 0,
      message: "Message sent successfully",
    };

    mockGetOrganizationsWithNotification.mockResolvedValue(mockOrganizations);
    mockSendMessageViaWebhook.mockResolvedValue(mockSendResult);

    const result = await dailyReviewHandler(
      mockDB,
      testEncryptionKey,
      testDate
    );

    // getOrganizationsWithNotificationが正しく呼ばれることを確認
    expect(mockGetOrganizationsWithNotification).toHaveBeenCalledWith(
      mockDB,
      "daily"
    );

    // sendMessageViaWebhookが各チャンネルに対して呼ばれることを確認
    expect(mockSendMessageViaWebhook).toHaveBeenCalledTimes(2);
    expect(mockSendMessageViaWebhook).toHaveBeenCalledWith(
      mockDB,
      testEncryptionKey,
      "channel-1",
      expect.any(Object) // メッセージオブジェクト
    );
    expect(mockSendMessageViaWebhook).toHaveBeenCalledWith(
      mockDB,
      testEncryptionKey,
      "channel-2",
      expect.any(Object) // メッセージオブジェクト
    );

    // 戻り値の確認
    expect(result).toEqual({
      message: expect.stringContaining("完了"),
      processedCount: 2,
      successCount: 2,
      failureCount: 0,
    });
  });

  it("should handle sendMessageViaWebhook throwing exceptions", async () => {
    const mockOrganizations = [
      {
        organizationId: "org-exception",
        organizationName: "Exception Organization",
        channels: [
          {
            channelUuid: "channel-exception",
            channelName: "general",
            notificationSettings: {
              daily: true,
              weekly: false,
              monthly: false,
            },
          },
        ],
      },
    ];

    mockGetOrganizationsWithNotification.mockResolvedValue(mockOrganizations);
    mockSendMessageViaWebhook.mockRejectedValue(new Error("Unexpected error"));

    const result = await dailyReviewHandler(
      mockDB,
      testEncryptionKey,
      testDate
    );

    // 戻り値の確認
    expect(result).toEqual({
      message: expect.stringContaining("完了"),
      processedCount: 1,
      successCount: 0,
      failureCount: 1,
    });
  });

  it("should handle getOrganizationsWithNotification throwing exception", async () => {
    // getOrganizationsWithNotificationが例外をスロー
    mockGetOrganizationsWithNotification.mockRejectedValue(
      new Error("Database connection failed")
    );

    await expect(
      dailyReviewHandler(mockDB, testEncryptionKey, testDate)
    ).rejects.toThrow("Database connection failed");
  });

  it("should implement rate limiting between organizations", async () => {
    const mockOrganizations = [
      {
        organizationId: "org-1",
        organizationName: "Organization 1",
        channels: [
          {
            channelUuid: "channel-1",
            channelName: "general",
            notificationSettings: {
              daily: true,
              weekly: false,
              monthly: false,
            },
          },
        ],
      },
      {
        organizationId: "org-2",
        organizationName: "Organization 2",
        channels: [
          {
            channelUuid: "channel-2",
            channelName: "general",
            notificationSettings: {
              daily: true,
              weekly: false,
              monthly: false,
            },
          },
        ],
      },
    ];

    mockGetOrganizationsWithNotification.mockResolvedValue(mockOrganizations);
    mockSendMessageViaWebhook.mockResolvedValue({
      success: true,
      successCount: 1,
      failureCount: 0,
      message: "Success",
    });

    // setTimeoutをモック
    const setTimeoutSpy = vi
      .spyOn(global, "setTimeout")
      .mockImplementation((callback: () => void) => {
        callback(); // 即座に実行
        return 1 as unknown as NodeJS.Timeout; // NodeJS.Timeoutの代わり
      });

    const result = await dailyReviewHandler(
      mockDB,
      testEncryptionKey,
      testDate
    );

    // 各組織にチャンネルがあるため、組織数分だけsetTimeoutが呼ばれることを確認
    expect(setTimeoutSpy).toHaveBeenCalledTimes(2);
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1000);

    // 戻り値の確認
    expect(result).toEqual({
      message: expect.stringContaining("完了"),
      processedCount: 2,
      successCount: 2,
      failureCount: 0,
    });

    setTimeoutSpy.mockRestore();
  });
});
