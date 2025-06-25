import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  type MockedFunction,
} from "vitest";
import { Request, Response } from "express";
import { handler } from "./daily-review";

// @repo/coreのモック
vi.mock("@repo/core", () => ({
  getOrganizationsWithNotification: vi.fn(),
  sendDailyDigest: vi.fn(),
}));

// @repo/db/clientのモック
vi.mock("@repo/db/client", () => ({
  dbClient: vi.fn(() => ({})), // モックDBオブジェクト
}));

// モジュールをインポート（モック後）
import { getOrganizationsWithNotification, sendDailyDigest } from "@repo/core";

const mockGetOrganizationsWithNotification =
  getOrganizationsWithNotification as MockedFunction<
    typeof getOrganizationsWithNotification
  >;
const mockSendDailyDigest = sendDailyDigest as MockedFunction<
  typeof sendDailyDigest
>;

const testEncryptionKey = "test-encryption-key";

describe("Daily Review Handler", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Requestモック
    mockReq = {};

    process.env.DISCORD_ENCRYPTION_KEY = testEncryptionKey;

    // Responseモック
    jsonSpy = vi.fn();
    statusSpy = vi.fn().mockReturnValue({ json: jsonSpy });
    mockRes = {
      json: jsonSpy,
      status: statusSpy,
    };

    // モック関数をリセット
    vi.clearAllMocks();

    // console.logをモック（テスト出力を綺麗にするため）
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should return success when no organizations have daily notification enabled", async () => {
    // 空の組織リストを返すようにモック
    mockGetOrganizationsWithNotification.mockResolvedValue([]);

    await handler(mockReq as Request, mockRes as Response);

    // getOrganizationsWithNotificationが正しく呼ばれることを確認
    expect(mockGetOrganizationsWithNotification).toHaveBeenCalledWith(
      {},
      "daily"
    );

    // sendDailyDigestは呼ばれないことを確認
    expect(mockSendDailyDigest).not.toHaveBeenCalled();

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
            channelId: "channel-1",
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
            channelId: "channel-2",
            channelName: "notifications",
            notificationSettings: { daily: true, weekly: true, monthly: false },
          },
        ],
      },
    ];

    const mockSendResults = [
      {
        success: true,
        successCount: 1,
        failureCount: 0,
        message:
          "日次ダイジェストを送信しました（2025-06-23）: 成功 1件、失敗 0件",
      },
      {
        success: true,
        successCount: 1,
        failureCount: 0,
        message:
          "日次ダイジェストを送信しました（2025-06-23）: 成功 1件、失敗 0件",
      },
    ];

    mockGetOrganizationsWithNotification.mockResolvedValue(mockOrganizations);
    mockSendDailyDigest
      .mockResolvedValueOnce(mockSendResults[0]!)
      .mockResolvedValueOnce(mockSendResults[1]!);

    await handler(mockReq as Request, mockRes as Response);

    // getOrganizationsWithNotificationが正しく呼ばれることを確認
    expect(mockGetOrganizationsWithNotification).toHaveBeenCalledWith(
      {},
      "daily"
    );

    // sendDailyDigestが各組織に対して呼ばれることを確認
    expect(mockSendDailyDigest).toHaveBeenCalledTimes(2);
    expect(mockSendDailyDigest).toHaveBeenCalledWith(
      {},
      testEncryptionKey,
      mockOrganizations[0],
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) // YYYY-MM-DD形式の前日日付
    );
    expect(mockSendDailyDigest).toHaveBeenCalledWith(
      {},
      testEncryptionKey,
      mockOrganizations[1],
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
    );

    // レスポンスの確認
    expect(jsonSpy).toHaveBeenCalledWith({
      success: true,
      message: expect.stringContaining("日次ダイジェスト処理が完了しました"),
      processedCount: 2,
      successCount: 2,
      failureCount: 0,
      organizationFailures: 0,
      errors: undefined,
    });
  });

  it("should handle partial failures in organizations", async () => {
    const mockOrganizations = [
      {
        organizationId: "org-success",
        organizationName: "Success Organization",
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
        ],
      },
      {
        organizationId: "org-fail",
        organizationName: "Fail Organization",
        channels: [
          {
            channelId: "channel-fail",
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

    const successResult = {
      success: true,
      successCount: 1,
      failureCount: 0,
      message:
        "日次ダイジェストを送信しました（2025-06-23）: 成功 1件、失敗 0件",
    };

    const failureResult = {
      success: false,
      successCount: 0,
      failureCount: 1,
      error: "Discord API error",
      message:
        "日次ダイジェストを送信しました（2025-06-23）: 成功 0件、失敗 1件",
    };

    mockGetOrganizationsWithNotification.mockResolvedValue(mockOrganizations);
    mockSendDailyDigest
      .mockResolvedValueOnce(successResult)
      .mockResolvedValueOnce(failureResult);

    await handler(mockReq as Request, mockRes as Response);

    // レスポンスの確認
    expect(jsonSpy).toHaveBeenCalledWith({
      success: true,
      message: expect.stringContaining("日次ダイジェスト処理が完了しました"),
      processedCount: 2,
      successCount: 1,
      failureCount: 1,
      organizationFailures: 1, // 1つの組織で失敗
      errors: ["Discord API error"],
    });
  });

  it("should handle sendDailyDigest throwing exceptions", async () => {
    const mockOrganizations = [
      {
        organizationId: "org-exception",
        organizationName: "Exception Organization",
        channels: [
          {
            channelId: "channel-exception",
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
    mockSendDailyDigest.mockRejectedValue(new Error("Unexpected error"));

    await handler(mockReq as Request, mockRes as Response);

    // レスポンスの確認
    expect(jsonSpy).toHaveBeenCalledWith({
      success: true,
      message: expect.stringContaining("日次ダイジェスト処理が完了しました"),
      processedCount: 1,
      successCount: 0,
      failureCount: 1, // 例外により1チャンネル分失敗
      organizationFailures: 1,
      errors: ["Unexpected error"],
    });
  });

  it("should handle getOrganizationsWithNotification throwing exception", async () => {
    // getOrganizationsWithNotificationが例外をスロー
    mockGetOrganizationsWithNotification.mockRejectedValue(
      new Error("Database connection failed")
    );

    await handler(mockReq as Request, mockRes as Response);

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
    const mockDate = new Date("2025-06-24T10:00:00Z");
    vi.setSystemTime(mockDate);

    await handler(mockReq as Request, mockRes as Response);

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
            channelId: "channel-1",
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
            channelId: "channel-2",
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
    mockSendDailyDigest.mockResolvedValue({
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

    await handler(mockReq as Request, mockRes as Response);

    // 組織数から1を引いた回数だけsetTimeoutが呼ばれることを確認（最後の組織の後は待機しない）
    expect(setTimeoutSpy).toHaveBeenCalledTimes(2);
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1000);

    setTimeoutSpy.mockRestore();
  });
});
