import {
  describe,
  it,
  beforeEach,
  expect,
  vi,
  beforeAll,
  afterAll,
} from "vitest";
import { dbClient } from "@repo/db/client";
import { discordChannelsTable, organizationsTable } from "@repo/db/schema";
import { sendViaWebhook, type WebhookPayload } from "./webhook";
import { encrypt } from "./utils";
import { randomUUID } from "crypto";
import {
  DiscordWebhookError,
  DiscordRateLimitError,
  DiscordChannelNotFoundError,
} from "./errors";

const db = dbClient();

// fetch APIをモック（vitestの安全なモック方法を使用）
const mockFetch = vi.fn();

describe("sendViaWebhook", () => {
  let testOrgId: string;
  let testChannelUuid: string;
  let testWebhookId: string;
  let testWebhookToken: string;
  let testWebhookTokenEnc: string;

  beforeAll(async () => {
    // fetchを安全にモック
    vi.stubGlobal("fetch", mockFetch);

    // 暗号化された WebhookToken を準備
    testWebhookToken = "test_webhook_token_12345";
    testWebhookTokenEnc = await encrypt(testWebhookToken);
  });

  afterAll(async () => {
    // モックをリストア
    vi.unstubAllGlobals();

    // テスト後のクリーンアップ
    await db.transaction(async (tx) => {
      await tx.delete(discordChannelsTable);
      await tx.delete(organizationsTable);
    });
  });

  beforeEach(async () => {
    // モックをリセット
    vi.clearAllMocks();

    // テスト用のデータベースをリセット
    await db.transaction(async (tx) => {
      await tx.delete(discordChannelsTable);
      await tx.delete(organizationsTable);
    });

    // テストデータをセットアップ
    testOrgId = "test-org-id";
    testChannelUuid = randomUUID();
    testWebhookId = "123456789";

    await db.insert(organizationsTable).values({
      id: testOrgId,
      name: "Test Organization",
      description: "Test description",
    });

    await db.insert(discordChannelsTable).values({
      id: testChannelUuid,
      organizationId: testOrgId,
      guildId: "test-guild-id",
      guildName: "Test Guild",
      channelId: "test-channel-id",
      name: "Test Channel",
      webhookId: testWebhookId,
      webhookTokenEnc: testWebhookTokenEnc,
    });
  });

  describe("正常系", () => {
    it("should send webhook with JSON payload successfully", async () => {
      // Arrange
      const payload: WebhookPayload = {
        content: "Test message",
        username: "Farm Bot",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: "message-id-123" }),
      });

      // Act
      const result = await sendViaWebhook(db, testChannelUuid, payload);

      // Assert
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        `https://discord.com/api/webhooks/${testWebhookId}/${testWebhookToken}?wait=true`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      expect(result).toEqual({ id: "message-id-123" });
    });

    it("should send webhook with files using FormData", async () => {
      // Arrange
      const payload: WebhookPayload = {
        content: "Test message with file",
      };
      const fileData = Buffer.from("test file content");
      const options = {
        files: [{ name: "test.txt", data: fileData, mime: "text/plain" }],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: "message-id-456" }),
      });

      // Act
      const result = await sendViaWebhook(
        db,
        testChannelUuid,
        payload,
        options
      );

      // Assert
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const mockCall = mockFetch.mock.calls[0];
      if (!mockCall) throw new Error("Mock call not found");
      const [url, requestOptions] = mockCall;

      expect(url).toBe(
        `https://discord.com/api/webhooks/${testWebhookId}/${testWebhookToken}?wait=true`
      );
      expect(requestOptions.method).toBe("POST");
      expect(requestOptions.headers).toBeUndefined(); // FormDataの場合はheadersを設定しない
      expect(requestOptions.body).toBeInstanceOf(FormData);
      expect(result).toEqual({ id: "message-id-456" });
    });

    it("should handle wait=false option", async () => {
      // Arrange
      const payload: WebhookPayload = { content: "Test message" };
      const options = { wait: false };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204, // No Content
      });

      // Act
      const result = await sendViaWebhook(
        db,
        testChannelUuid,
        payload,
        options
      );

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        `https://discord.com/api/webhooks/${testWebhookId}/${testWebhookToken}?`,
        expect.any(Object)
      );
      expect(result).toBeUndefined(); // wait=falseの場合はundefinedを返す
    });

    it("should handle threadId option", async () => {
      // Arrange
      const payload: WebhookPayload = { content: "Test message" };
      const options = { threadId: "thread-123" };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: "message-id-789" }),
      });

      // Act
      await sendViaWebhook(db, testChannelUuid, payload, options);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        `https://discord.com/api/webhooks/${testWebhookId}/${testWebhookToken}?wait=true&thread_id=thread-123`,
        expect.any(Object)
      );
    });
  });

  describe("エラー処理", () => {
    it("should throw error when channel not found", async () => {
      // Arrange
      const invalidChannelUuid = "invalid-channel-uuid";
      const payload: WebhookPayload = { content: "Test message" };

      // Act & Assert
      await expect(
        sendViaWebhook(db, invalidChannelUuid, payload)
      ).rejects.toThrow(DiscordChannelNotFoundError);

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should throw error when webhook token is missing", async () => {
      // Arrange
      const channelWithoutWebhook = randomUUID();
      await db.insert(discordChannelsTable).values({
        id: channelWithoutWebhook,
        organizationId: testOrgId,
        guildId: "test-guild-id-2",
        guildName: "Test Guild 2",
        channelId: "test-channel-id-2",
        name: "Test Channel 2",
        webhookId: null,
        webhookTokenEnc: null,
      });

      const payload: WebhookPayload = { content: "Test message" };

      // Act & Assert
      await expect(
        sendViaWebhook(db, channelWithoutWebhook, payload)
      ).rejects.toThrow(DiscordChannelNotFoundError);
    });

    it("should throw error on Discord API error", async () => {
      // Arrange
      const payload: WebhookPayload = { content: "Test message" };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => "Bad Request",
      });

      // Act & Assert
      await expect(
        sendViaWebhook(db, testChannelUuid, payload)
      ).rejects.toThrow(DiscordWebhookError);
    });

    it("should handle different Discord error codes", async () => {
      // Arrange
      const payload: WebhookPayload = { content: "Test message" };

      // 404エラーのテスト
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () =>
          JSON.stringify({
            code: 10015,
            message: "Unknown Webhook",
          }),
      });

      // Act & Assert
      await expect(
        sendViaWebhook(db, testChannelUuid, payload)
      ).rejects.toThrow(DiscordWebhookError);
    });

    it("should handle network errors with retry", async () => {
      // Arrange
      const payload: WebhookPayload = { content: "Test message" };
      const options = { maxRetries: 1 };

      // ネットワークエラーを2回発生させる
      mockFetch
        .mockRejectedValueOnce(new Error("Network timeout"))
        .mockRejectedValueOnce(new Error("Connection refused"));

      // Act & Assert
      await expect(
        sendViaWebhook(db, testChannelUuid, payload, options)
      ).rejects.toThrow(DiscordWebhookError);

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("レートリミット処理", () => {
    it("should retry on rate limit (429) and succeed", async () => {
      // Arrange
      const payload: WebhookPayload = { content: "Test message" };

      // 最初は429、次は成功
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: new Map([["Retry-After", "1"]]),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ id: "message-id-retry" }),
        });

      // setTimeoutをモック
      const mockSetTimeout = vi
        .spyOn(global, "setTimeout")
        .mockImplementation((callback: () => void) => {
          callback();
          return 0 as unknown as NodeJS.Timeout;
        });

      // Act
      const result = await sendViaWebhook(db, testChannelUuid, payload);

      // Assert
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 1050); // 1秒 + 50ms
      expect(result).toEqual({ id: "message-id-retry" });

      // クリーンアップ
      mockSetTimeout.mockRestore();
    });

    it("should fail after max retries on persistent rate limit", async () => {
      // Arrange
      const payload: WebhookPayload = { content: "Test message" };
      const options = { maxRetries: 2 };

      // 全てのリクエストで429を返す
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Map([["Retry-After", "1"]]),
      });

      // setTimeoutをモック
      const mockSetTimeout = vi
        .spyOn(global, "setTimeout")
        .mockImplementation((callback: () => void) => {
          callback();
          return 0 as unknown as NodeJS.Timeout;
        });

      // Act & Assert
      await expect(
        sendViaWebhook(db, testChannelUuid, payload, options)
      ).rejects.toThrow(DiscordRateLimitError);

      expect(mockFetch).toHaveBeenCalledTimes(3); // 初回 + 2回リトライ

      // クリーンアップ
      mockSetTimeout.mockRestore();
    });
  });
});
