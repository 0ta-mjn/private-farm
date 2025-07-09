import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  type MockedFunction,
  beforeAll,
} from "vitest";
import { dailyReviewHandler } from "./handler";
import { createTestDashboardD1DB } from "@repo/dashboard-db/testing";

// @repo/discord/webhookのモック
vi.mock("@repo/discord", () => ({
  sendViaWebhook: vi.fn(),
}));

// モジュールをインポート（モック後）
import { sendViaWebhook } from "@repo/discord";

const mockSendViaWebhook = sendViaWebhook as MockedFunction<
  typeof sendViaWebhook
>;

const db = await createTestDashboardD1DB();

const testDate = new Date("2025-06-24T10:00:00Z").toISOString().split("T")[0]!; // 2025-06-24
const testUserId = "test-user-id";

describe("Daily Review Handler", () => {
  let org1Id: string;
  let org2Id: string;
  beforeAll(async () => {
    const { organization: org1 } = await db.user.setup(testUserId, {
      userName: "Test User",
      organizationName: "Test Organization 1",
    });
    const { organization: org2 } = await db.organization.create(testUserId, {
      organizationName: "Test Organization 2",
    });
    org1Id = org1.id;
    org2Id = org2.id;
  });

  beforeEach(async () => {
    // モック関数をリセット
    vi.clearAllMocks();

    // すべてのチャネルを削除
    const deleteAllChannels = async (orgId: string) =>
      db.discord.listByOrganizationId(orgId).then((channels) =>
        Promise.all(
          channels.map((channel) =>
            db.discord.unlink({
              organizationId: orgId,
              channelId: channel.id,
            })
          )
        )
      );
    await deleteAllChannels(org1Id);
    await deleteAllChannels(org2Id);

    // デフォルトモック
    mockSendViaWebhook.mockResolvedValue(undefined);

    // console.logをモック（テスト出力を綺麗にするため）
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should return success when no organizations have daily notification enabled", async () => {
    const result = await dailyReviewHandler(db, testDate);

    // sendDailyDigestは呼ばれないことを確認
    expect(mockSendViaWebhook).not.toHaveBeenCalled();

    // 戻り値の確認
    expect(result).toEqual({
      message: "日次通知が有効な組織がありません",
      processedCount: 0,
    });
  });

  it("should process organizations successfully", async () => {
    // Discord チャンネルデータを挿入
    await db.discord.createOrUpdate(org1Id, {
      guildId: "guild-1",
      guildName: "Guild 1",
      channelId: "discord-channel-1",
      channelName: "general",
      webhookId: "webhook-1",
      webhookToken: "encrypted-webhook-token-1",
      notificationSettings: { daily: true, weekly: false, monthly: false },
    });
    await db.discord.createOrUpdate(org2Id, {
      guildId: "guild-2",
      guildName: "Guild 2",
      channelId: "discord-channel-2",
      channelName: "notifications",
      webhookId: "webhook-2",
      webhookToken: "encrypted-webhook-token-2",
      notificationSettings: { daily: true, weekly: true, monthly: false },
    });

    const result = await dailyReviewHandler(db, testDate);

    // sendViaWebhookが各チャンネルに対して呼ばれることを確認
    expect(mockSendViaWebhook).toHaveBeenCalledTimes(2);

    // 戻り値の確認
    expect(result).toEqual({
      message: expect.stringContaining("完了"),
      processedCount: 2,
      successCount: 2,
      failureCount: 0,
    });
  });

  it("should handle sendViaWebhook throwing exceptions", async () => {
    await db.discord.createOrUpdate(org1Id, {
      guildId: "guild-exception",
      guildName: "Guild Exception",
      channelId: "discord-channel-exception",
      channelName: "general",
      webhookId: "webhook-exception",
      webhookToken: "encrypted-webhook-token-exception",
      notificationSettings: { daily: true, weekly: false, monthly: false },
    });

    mockSendViaWebhook.mockRejectedValue(new Error("Unexpected error"));

    const result = await dailyReviewHandler(db, testDate);

    // 戻り値の確認
    expect(result).toEqual({
      message: expect.stringContaining("完了"),
      processedCount: 1,
      successCount: 0,
      failureCount: 1,
    });
  });

  it("should implement rate limiting between organizations", async () => {
    await db.discord.createOrUpdate(org1Id, {
      guildId: "rate-guild-1",
      guildName: "Rate Guild 1",
      channelId: "rate-discord-channel-1",
      channelName: "general",
      webhookId: "rate-webhook-1",
      webhookToken: "encrypted-webhook-token-1",
      notificationSettings: { daily: true, weekly: false, monthly: false },
    });
    await db.discord.createOrUpdate(org2Id, {
      guildId: "rate-guild-2",
      guildName: "Rate Guild 2",
      channelId: "rate-discord-channel-2",
      channelName: "general",
      webhookId: "rate-webhook-2",
      webhookToken: "encrypted-webhook-token-2",
      notificationSettings: { daily: true, weekly: false, monthly: false },
    });

    // setTimeoutをモック
    const setTimeoutSpy = vi
      .spyOn(global, "setTimeout")
      .mockImplementation((callback: () => void) => {
        callback(); // 即座に実行
        return 1 as unknown as NodeJS.Timeout;
      });

    const result = await dailyReviewHandler(db, testDate, {
      sleepAfterOrg: 1000,
    });

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
