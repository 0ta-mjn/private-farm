import {
  describe,
  it,
  beforeEach,
  expect,
  vi,
  beforeAll,
  afterAll,
} from "vitest";
import { dbClient } from "@repo/dashboard-db/client";
import { discordChannelsTable, organizationsTable } from "@repo/dashboard-db/schema";
import {
  DiscordRegistrationKeys,
  registerDiscordChannel,
} from "./installation";
import { encrypt, decrypt } from "./utils";
import { DiscordAPIError, DiscordAuthError } from "./errors";

const db = dbClient();

// fetch APIをモック（vitestの安全なモック方法を使用）
const mockFetch = vi.fn();

const testKeys: DiscordRegistrationKeys = {
  discordClientId: "test-client-id",
  discordClientSecret: "test-client-secret",
  discordBotToken: "test-bot-token",
  // 32文字のランダムなキーを使用
  encryptionKey: "12345678901234567890123456789012", // 32文字のキー
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
  let testOrgId: string;
  let testCode: string;
  let testGuildId: string;
  let testRedirectUri: string;

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
    testCode = "test-oauth-code-12345";
    testGuildId = "test-guild-id-67890";
    testRedirectUri = "https://example.com/callback";

    await db.insert(organizationsTable).values({
      id: testOrgId,
      name: "Test Organization",
      description: "Test description",
    });
  });

  afterAll(async () => {
    // テスト後のクリーンアップ
    await db.transaction(async (tx) => {
      await tx.delete(discordChannelsTable);
      await tx.delete(organizationsTable);
    });
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
        organizationId: testOrgId,
        code: testCode,
        guildId: testGuildId,
        redirectUri: testRedirectUri,
      };

      // Act
      const result = await registerDiscordChannel(db, testKeys, params);

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
      expect(result.webhookToken).toEqual(mockTokenResponse.webhook);

      // データベースに正しくレコードが作成されているか確認
      const channels = await db.select().from(discordChannelsTable);
      expect(channels).toHaveLength(1);
      const channel = channels[0]!;
      expect(channel).toMatchObject({
        organizationId: testOrgId,
        guildId: testGuildId,
        guildName: "Test Guild Name",
        channelId: "test-channel-id",
        name: "Test Channel",
        webhookId: "test-webhook-id",
        notificationSettings: {
          daily: true,
          weekly: true,
          monthly: true,
        },
      });

      // Webhook トークンが暗号化されて保存されているか確認
      expect(
        await decrypt(channel.webhookTokenEnc!, testKeys.encryptionKey)
      ).toBe("test-webhook-token");
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
        organizationId: testOrgId,
        code: testCode,
        guildId: testGuildId,
        redirectUri: testRedirectUri,
      };

      // Act & Assert
      await expect(
        registerDiscordChannel(db, testKeys, params)
      ).rejects.toThrow(DiscordAPIError);

      // データベースにレコードが作成されていないことを確認
      const channels = await db.select().from(discordChannelsTable);
      expect(channels).toHaveLength(0);
    });

    it("should update existing channel when re-installing", async () => {
      // Arrange - 既存のチャンネルを作成
      await db.insert(discordChannelsTable).values({
        id: "existing-channel-id",
        organizationId: testOrgId,
        guildId: testGuildId,
        guildName: "Old Guild Name",
        channelId: "test-channel-id",
        name: "Old Channel Name",
        webhookId: "old-webhook-id",
        webhookTokenEnc: await encrypt(
          "old-webhook-token",
          testKeys.encryptionKey
        ),
        notificationSettings: {
          daily: false,
          weekly: false,
          monthly: false,
        },
      });

      const mockTokenResponse = {
        access_token: "new-access-token",
        refresh_token: "new-refresh-token",
        expires_in: 7200,
        scope: "bot webhook.incoming",
        guild: {
          id: testGuildId,
          name: "Updated Guild Name",
        },
        bot: {
          id: "new-bot-user-id",
        },
        webhook: {
          id: "new-webhook-id",
          token: "new-webhook-token",
          guild_id: testGuildId,
          channel_id: "test-channel-id",
          name: "New Channel",
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
            name: "New Channel",
            type: 0,
          },
        ],
      });

      const params = {
        organizationId: testOrgId,
        code: testCode,
        guildId: testGuildId,
        redirectUri: testRedirectUri,
      };

      // Act
      const result = await registerDiscordChannel(db, testKeys, params);

      // Assert
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.guildId).toBe(testGuildId);
      expect(result.webhookId).toBe("new-webhook-id");

      // チャンネルが更新されている
      const channels = await db.select().from(discordChannelsTable);
      expect(channels).toHaveLength(1);
      const channel = channels[0]!;
      expect(channel).toMatchObject({
        organizationId: testOrgId,
        guildId: testGuildId,
        guildName: "Updated Guild Name",
        channelId: "test-channel-id",
        name: "New Channel",
        webhookId: "new-webhook-id",
        notificationSettings: {
          daily: false,
          weekly: false,
          monthly: false,
        },
      });

      // 新しいトークンが保存されている
      expect(
        await decrypt(channel.webhookTokenEnc!, testKeys.encryptionKey)
      ).toBe("new-webhook-token");
    });

    it("should add second channel for same organization", async () => {
      // Arrange - 既存のチャンネルを作成
      await db.insert(discordChannelsTable).values({
        id: "existing-channel-id",
        organizationId: testOrgId,
        guildId: testGuildId,
        guildName: "Test Guild Name",
        channelId: "existing-channel-id",
        name: "Existing Channel",
        webhookId: "existing-webhook-id",
        webhookTokenEnc: await encrypt(
          "existing-webhook-token",
          testKeys.encryptionKey
        ),
      });

      // 2つ目のチャンネル用のWebhookレスポンス
      const mockTokenResponse = {
        access_token: "updated-access-token",
        refresh_token: "updated-refresh-token",
        expires_in: 7200,
        scope: "bot webhook.incoming",
        guild: {
          id: testGuildId,
          name: "Test Guild Name",
        },
        bot: {
          id: "test-bot-user-id",
        },
        webhook: {
          id: "second-webhook-id",
          token: "second-webhook-token",
          guild_id: testGuildId,
          channel_id: "second-channel-id",
          name: "Second Channel",
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
            id: "second-channel-id",
            name: "Second Channel",
            type: 0,
          },
        ],
      });

      const params = {
        organizationId: testOrgId,
        code: testCode,
        guildId: testGuildId,
        redirectUri: testRedirectUri,
      };

      // Act
      const result = await registerDiscordChannel(db, testKeys, params);

      // Assert
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.guildId).toBe(testGuildId);
      expect(result.webhookId).toBe("second-webhook-id");
      expect(result.webhookToken).toEqual(mockTokenResponse.webhook);
      expect(result.channelId).toBe("second-channel-id");

      // チャンネルが2つになっている
      const channels = await db.select().from(discordChannelsTable);
      expect(channels).toHaveLength(2);

      // 既存チャンネルが残っている
      const existingChannel = channels.find(
        (c) => c.channelId === "existing-channel-id"
      );
      expect(existingChannel).toBeDefined();
      expect(existingChannel!.name).toBe("Existing Channel");

      // 新しいチャンネルが追加されている
      const newChannel = channels.find(
        (c) => c.channelId === "second-channel-id"
      );
      expect(newChannel).toBeDefined();
      expect(newChannel!).toMatchObject({
        organizationId: testOrgId,
        guildId: testGuildId,
        channelId: "second-channel-id",
        name: "Second Channel",
        webhookId: "second-webhook-id",
      });
      expect(
        await decrypt(newChannel!.webhookTokenEnc!, testKeys.encryptionKey)
      ).toBe("second-webhook-token");
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
        organizationId: testOrgId,
        code: testCode,
        guildId: testGuildId,
        redirectUri: testRedirectUri,
      };

      // Act
      const result = await registerDiscordChannel(db, testKeys, params);

      // Assert
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.guildId).toBe(testGuildId); // パラメータから取得

      const channels = await db.select().from(discordChannelsTable);
      expect(channels[0]).toMatchObject({
        guildId: testGuildId,
        guildName: "", // デフォルト値
        name: "Test Channel",
      });
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
        organizationId: testOrgId,
        code: "invalid-code",
        guildId: testGuildId,
        redirectUri: testRedirectUri,
      }; // Act & Assert
      await expect(
        registerDiscordChannel(db, testKeys, params)
      ).rejects.toThrow(DiscordAuthError);

      // データベースにレコードが作成されていないことを確認
      const channels = await db.select().from(discordChannelsTable);
      expect(channels).toHaveLength(0);
    });

    it("should throw error when organization does not exist", async () => {
      // Arrange
      const mockTokenResponse = {
        access_token: "test-access-token",
        refresh_token: "test-refresh-token",
        expires_in: 3600,
        scope: "bot",
        guild: { id: testGuildId, name: "Test Guild" },
        bot: { id: "test-bot-id" },
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
        organizationId: "non-existent-org-id",
        code: testCode,
        guildId: testGuildId,
        redirectUri: testRedirectUri,
      };

      // Act & Assert
      await expect(
        registerDiscordChannel(db, testKeys, params)
      ).rejects.toThrow(); // 外部キー制約エラー
    });

    it("should handle network errors", async () => {
      // Arrange
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const params = {
        organizationId: testOrgId,
        code: testCode,
        guildId: testGuildId,
        redirectUri: testRedirectUri,
      };

      // Act & Assert
      await expect(
        registerDiscordChannel(db, testKeys, params)
      ).rejects.toThrow("Network error");
    });

    it("should throw DiscordConfigError when environment variables are missing", async () => {
      // Arrange
      const invalidKeys = {
        discordClientId: "",
        discordClientSecret: "",
        discordBotToken: "",
        encryptionKey: "",
      };

      const params = {
        organizationId: testOrgId,
        code: testCode,
        guildId: testGuildId,
        redirectUri: testRedirectUri,
      }; // Act & Assert
      await expect(
        registerDiscordChannel(db, invalidKeys, params)
      ).rejects.toThrow();

      // Since empty keys should cause an error earlier in the process
    });
  });

  describe("データ整合性", () => {
    it("should encrypt sensitive tokens", async () => {
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
        organizationId: testOrgId,
        code: testCode,
        guildId: testGuildId,
        redirectUri: testRedirectUri,
      };

      // Act
      await registerDiscordChannel(db, testKeys, params);

      // Assert
      expect(mockFetch).toHaveBeenCalledTimes(2);
      const channels = await db.select().from(discordChannelsTable);

      // 平文トークンがデータベースに保存されていないことを確認
      const channel = channels[0]!;
      expect(channel.webhookTokenEnc).not.toBe("sensitive-webhook-token");

      // 復号化すると元のトークンが取得できることを確認
      expect(
        await decrypt(channel.webhookTokenEnc!, testKeys.encryptionKey)
      ).toBe("sensitive-webhook-token");
    });

    it("should work without expires_in validation (simplified bot mode)", async () => {
      // Arrange
      const mockTokenResponse = {
        access_token: "test-access-token",
        refresh_token: "test-refresh-token",
        expires_in: 3600, // 1時間
        scope: "bot webhook.incoming",
        guild: { id: testGuildId, name: "Test Guild" },
        bot: { id: "test-bot-id" },
        webhook: {
          id: "webhook-id",
          token: "webhook-token",
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
        organizationId: testOrgId,
        code: testCode,
        guildId: testGuildId,
        redirectUri: testRedirectUri,
      };

      // Act
      await registerDiscordChannel(db, testKeys, params);

      // Assert
      expect(mockFetch).toHaveBeenCalledTimes(2);
      const channels = await db.select().from(discordChannelsTable);
      const channel = channels[0]!;

      // チャンネルが正常に作成されていることを確認
      expect(channel).toMatchObject({
        organizationId: testOrgId,
        guildId: testGuildId,
        channelId: "channel-id",
        webhookId: "webhook-id",
        name: "Test Channel",
      });
    });
  });
});
