import {
  describe,
  it,
  beforeEach,
  expect,
  vi,
  beforeAll,
  afterAll,
} from "vitest";
import {
  DiscordRegistrationKeys,
  registerDiscordChannel,
} from "./registration";
import { DiscordAPIError } from "./errors";

// fetch APIをモック（vitestの安全なモック方法を使用）
const mockFetch = vi.fn();

const testKeys: DiscordRegistrationKeys = {
  discordClientId: "test-client-id",
  discordClientSecret: "test-client-secret",
  discordBotToken: "test-bot-token",
};

// 環境変数をモック
beforeAll(() => {
  // fetchを安全にモック
  vi.stubGlobal("fetch", mockFetch);
});

afterAll(() => {
  // モックをリストア
  vi.unstubAllGlobals();
});

describe("registerDiscordChannel", () => {
  let testCode: string;
  let testGuildId: string;
  let testRedirectUri: string;

  beforeEach(async () => {
    // モックをリセット
    vi.clearAllMocks();

    // テストデータをセットアップ
    testCode = "test-oauth-code-12345";
    testGuildId = "test-guild-id-67890";
    testRedirectUri = "https://example.com/callback";
  });

  describe("正常系", () => {
    it("should register Discord channel with webhook successfully", async () => {
      // Arrange
      const mockTokenResponse = {
        access_token: "test-access-token",
        refresh_token: "test-refresh-token",
        expires_in: 3600,
        scope: "bot webhook.incoming",
        guild: {
          id: testGuildId,
          name: "Test Guild Name",
        },
        bot: {
          id: "test-bot-user-id",
        },
        webhook: {
          id: "test-webhook-id",
          token: "test-webhook-token",
          guild_id: testGuildId,
          channel_id: "test-channel-id",
          name: "Test Channel",
          avatar: null,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockTokenResponse,
      });

      // チャンネル名取得のための2回目のfetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [
          {
            id: "test-channel-id",
            name: "Test Channel",
            type: 0,
          },
        ],
      });

      const params = {
        code: testCode,
        guildId: testGuildId,
        redirectUri: testRedirectUri,
      };

      // Act
      const result = await registerDiscordChannel(testKeys, params);

      // Assert
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://discord.com/api/oauth2/token",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: "test-client-id",
            client_secret: "test-client-secret",
            grant_type: "authorization_code",
            code: testCode,
            redirect_uri: testRedirectUri,
          }),
        }
      );

      // 戻り値の検証
      expect(result.channelId).toBe("test-channel-id");
      expect(result.guildId).toBe(testGuildId);
      expect(result.webhookId).toBe("test-webhook-id");
      expect(result.webhookToken).toBe("test-webhook-token");
      expect(result.channelName).toBe("Test Channel");
      expect(result.guildName).toBe("Test Guild Name");
    });

    it("should handle registration without webhook", async () => {
      // Arrange
      const mockTokenResponse = {
        access_token: "test-access-token",
        refresh_token: "test-refresh-token",
        expires_in: 3600,
        scope: "bot",
        guild: {
          id: testGuildId,
          name: "Test Guild Name",
        },
        bot: {
          id: "test-bot-user-id",
        },
        // webhook なし
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockTokenResponse,
      });

      const params = {
        code: testCode,
        guildId: testGuildId,
        redirectUri: testRedirectUri,
      };

      // Act
      const result = await registerDiscordChannel(testKeys, params);

      // Assert
      expect(result.webhookId).toBe(null);
      expect(result.webhookToken).toBe(null);
      expect(result.channelId).toBe(null);
      expect(result.guildId).toBe(testGuildId);
    });

    it("should handle missing guild info from token response", async () => {
      // Arrange
      const mockTokenResponse = {
        access_token: "test-access-token",
        refresh_token: "test-refresh-token",
        expires_in: 3600,
        scope: "bot webhook.incoming",
        // guild info なし
        bot: {
          id: "test-bot-user-id",
        },
        webhook: {
          id: "test-webhook-id",
          token: "test-webhook-token",
          guild_id: testGuildId,
          channel_id: "test-channel-id",
          name: "Test Channel",
          avatar: null,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockTokenResponse,
      });

      // チャンネル名取得のための2回目のfetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [
          {
            id: "test-channel-id",
            name: "Test Channel",
            type: 0,
          },
        ],
      });

      const params = {
        code: testCode,
        guildId: testGuildId,
        redirectUri: testRedirectUri,
      };

      // Act
      const result = await registerDiscordChannel(testKeys, params);

      // Assert
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.guildId).toBe(testGuildId); // パラメータから取得
      expect(result.guildName).toBe(""); // デフォルト値
      expect(result.channelName).toBe("Test Channel");
    });
  });

  describe("エラー処理", () => {
    it("should throw error when Discord OAuth fails", async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: "invalid_request",
          message: "Invalid code",
        }),
        text: async () => "Bad Request",
      });

      const params = {
        code: "invalid-code",
        guildId: testGuildId,
        redirectUri: testRedirectUri,
      };

      // Act & Assert
      await expect(
        registerDiscordChannel(testKeys, params)
      ).rejects.toThrow(DiscordAPIError);
    });

    it("should handle network errors", async () => {
      // Arrange
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const params = {
        code: testCode,
        guildId: testGuildId,
        redirectUri: testRedirectUri,
      };

      // Act & Assert
      await expect(
        registerDiscordChannel(testKeys, params)
      ).rejects.toThrow("Network error");
    });

    it("should throw error when environment variables are missing", async () => {
      // Arrange
      const invalidKeys = {
        discordClientId: "",
        discordClientSecret: "",
        discordBotToken: "",
      };

      const params = {
        code: testCode,
        guildId: testGuildId,
        redirectUri: testRedirectUri,
      };

      // Act & Assert
      await expect(
        registerDiscordChannel(invalidKeys, params)
      ).rejects.toThrow();
    });
  });

  describe("データ整合性", () => {
    it("should return correct webhook data", async () => {
      // Arrange
      const mockTokenResponse = {
        access_token: "sensitive-access-token",
        refresh_token: "sensitive-refresh-token",
        expires_in: 3600,
        scope: "bot webhook.incoming",
        guild: { id: testGuildId, name: "Test Guild" },
        bot: { id: "test-bot-id" },
        webhook: {
          id: "webhook-id",
          token: "sensitive-webhook-token",
          guild_id: testGuildId,
          channel_id: "channel-id",
          name: "Test Channel",
          avatar: null,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockTokenResponse,
      });

      // チャンネル名取得のための2回目のfetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [
          {
            id: "channel-id",
            name: "Test Channel",
            type: 0,
          },
        ],
      });

      const params = {
        code: testCode,
        guildId: testGuildId,
        redirectUri: testRedirectUri,
      };

      // Act
      const result = await registerDiscordChannel(testKeys, params);

      // Assert
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.webhookToken).toBe("sensitive-webhook-token");
      expect(result.webhookId).toBe("webhook-id");
      expect(result.channelId).toBe("channel-id");
      expect(result.channelName).toBe("Test Channel");
    });
  });
});
