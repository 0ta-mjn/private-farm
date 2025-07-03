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

// @repo/db/clientのモック
vi.mock("@repo/db/client", () => ({
  dbClient: vi.fn(() => ({})), // モックDBオブジェクト
}));

// モジュールをインポート（モック後）
import {
  getOrganizationsWithNotification,
  sendMessageViaWebhook,
} from "@repo/core";
import { getDailyDigestData, generateDailyDigestMessage } from "./daily-review";
import { Database } from "@repo/db/client";

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
  let jsonSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Responseモック
    jsonSpy = vi.fn();
    statusSpy = vi.fn().mockReturnValue({ json: jsonSpy });

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

    await dailyReviewHandler(mockDB, testEncryptionKey, testDate);

    // getOrganizationsWithNotificationが正しく呼ばれることを確認
    expect(mockGetOrganizationsWithNotification).toHaveBeenCalledWith(
      {},
      "daily"
    );

    // sendDailyDigestは呼ばれないことを確認
    expect(mockSendMessageViaWebhook).not.toHaveBeenCalled();

    // レスポンスの確認
    expect(jsonSpy).toHaveBeenCalledWith({
      success: true,
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

    await dailyReviewHandler(mockDB, testEncryptionKey, testDate);

    // getOrganizationsWithNotificationが正しく呼ばれることを確認
    expect(mockGetOrganizationsWithNotification).toHaveBeenCalledWith(
      {},
      "daily"
    );

    // sendMessageViaWebhookが各チャンネルに対して呼ばれることを確認
    expect(mockSendMessageViaWebhook).toHaveBeenCalledTimes(2);
    expect(mockSendMessageViaWebhook).toHaveBeenCalledWith(
      {},
      testEncryptionKey,
      "channel-1",
      expect.any(Object) // メッセージオブジェクト
    );
    expect(mockSendMessageViaWebhook).toHaveBeenCalledWith(
      {},
      testEncryptionKey,
      "channel-2",
      expect.any(Object) // メッセージオブジェクト
    );

    // レスポンスの確認
    expect(jsonSpy).toHaveBeenCalledWith({
      success: true,
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

    await dailyReviewHandler(mockDB, testEncryptionKey, testDate);

    // レスポンスの確認
    expect(jsonSpy).toHaveBeenCalledWith({
      success: true,
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

    await dailyReviewHandler(mockDB, testEncryptionKey, testDate);

    // エラーレスポンスの確認
    expect(statusSpy).toHaveBeenCalledWith(500);
    expect(jsonSpy).toHaveBeenCalledWith({
      success: false,
      error: "Internal server error",
      message: "Database connection failed",
    });
  });

  it("should generate correct yesterday date", async () => {
    // 空の組織リストを返してgetYesterdayDate()の動作をテスト
    mockGetOrganizationsWithNotification.mockResolvedValue([]);

    // 現在の日付をモック（テストの一貫性のため）
    await dailyReviewHandler(mockDB, testEncryptionKey, testDate);

    // console.logが前日の日付（2025-06-23）で呼ばれることを確認
    expect(console.log).toHaveBeenCalledWith(
      "Starting daily digest processing for date: 2025-06-23"
    );

    // システム時間をリセット
    vi.useRealTimers();
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

    await dailyReviewHandler(mockDB, testEncryptionKey, testDate);

    // 各組織にチャンネルがあるため、組織数分だけsetTimeoutが呼ばれることを確認
    expect(setTimeoutSpy).toHaveBeenCalledTimes(2);
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1000);

    setTimeoutSpy.mockRestore();
  });
});
