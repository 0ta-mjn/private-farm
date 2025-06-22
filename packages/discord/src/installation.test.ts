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
import {
  discordInstallationsTable,
  discordChannelsTable,
  organizationsTable,
} from "@repo/db/schema";
import { registerDiscordChannel } from "./installation";
import { encrypt, decrypt } from "./utils";

const db = dbClient();

// fetch APIをモック（vitestの安全なモック方法を使用）
const mockFetch = vi.fn();

// 環境変数をモック
const originalEnv = process.env;
beforeAll(() => {
  // fetchを安全にモック
  vi.stubGlobal("fetch", mockFetch);

  process.env.DISCORD_CLIENT_ID = "test-client-id";
  process.env.DISCORD_CLIENT_SECRET = "test-client-secret";
});

afterAll(() => {
  // モックをリストア
  vi.unstubAllGlobals();
  process.env = originalEnv;
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
      await tx.delete(discordInstallationsTable);
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
      await tx.delete(discordInstallationsTable);
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

      const params = {
        organizationId: testOrgId,
        code: testCode,
        guildId: testGuildId,
        redirectUri: testRedirectUri,
      };

      // Act
      const result = await registerDiscordChannel(db, params);

      // Assert
      expect(mockFetch).toHaveBeenCalledTimes(1);
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
      expect(result).toEqual({
        installationId: expect.any(String),
        guildId: testGuildId,
        botUserId: "test-bot-user-id",
        channelId: "test-channel-id",
        webhookId: "test-webhook-id",
        webhookToken: mockTokenResponse.webhook,
      });

      // データベースに正しくレコードが作成されているか確認
      const installations = await db.select().from(discordInstallationsTable);
      expect(installations).toHaveLength(1);
      const installation = installations[0]!;
      expect(installation).toMatchObject({
        organizationId: testOrgId,
        guildId: testGuildId,
        guildName: "Test Guild Name",
        botUserId: "test-bot-user-id",
        refreshInProgress: false,
      });

      // トークンが暗号化されて保存されているか確認
      expect(decrypt(installation.accessTokenEnc)).toBe("test-access-token");
      expect(decrypt(installation.refreshTokenEnc)).toBe("test-refresh-token");

      const channels = await db.select().from(discordChannelsTable);
      expect(channels).toHaveLength(1);
      const channel = channels[0]!;
      expect(channel).toMatchObject({
        installationId: installation.id,
        channelId: "test-channel-id",
        channelName: "Test Channel",
        webhookId: "test-webhook-id",
      });

      // Webhook トークンが暗号化されて保存されているか確認
      expect(decrypt(channel.webhookTokenEnc!)).toBe("test-webhook-token");
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

      // Act
      const result = await registerDiscordChannel(db, params);

      // Assert
      expect(result).toEqual({
        installationId: expect.any(String),
        guildId: testGuildId,
        botUserId: "test-bot-user-id",
        channelId: null,
        webhookId: null,
        webhookToken: null,
      });

      // インストールのみ作成され、チャンネルは作成されない
      const installations = await db.select().from(discordInstallationsTable);
      expect(installations).toHaveLength(1);

      const channels = await db.select().from(discordChannelsTable);
      expect(channels).toHaveLength(0);
    });

    it("should update existing installation when re-installing", async () => {
      // Arrange - 既存のインストールを作成
      const existingInstallationId = "existing-installation-id";
      await db.insert(discordInstallationsTable).values({
        id: existingInstallationId,
        organizationId: testOrgId,
        guildId: testGuildId,
        guildName: "Old Guild Name",
        botUserId: "old-bot-id",
        accessTokenEnc: encrypt("old-access-token"),
        refreshTokenEnc: encrypt("old-refresh-token"),
        expiresAt: new Date(Date.now() + 1800000), // 30分後
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
          channel_id: "new-channel-id",
          name: "New Channel",
          avatar: null,
        },
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

      // Act
      const result = await registerDiscordChannel(db, params);

      // Assert
      expect(result.guildId).toBe(testGuildId);
      expect(result.botUserId).toBe("new-bot-user-id");

      // インストールが更新されている
      const installations = await db.select().from(discordInstallationsTable);
      expect(installations).toHaveLength(1);
      const installation = installations[0]!;
      expect(installation).toMatchObject({
        organizationId: testOrgId,
        guildId: testGuildId,
        guildName: "Updated Guild Name",
        botUserId: "new-bot-user-id",
      });

      // 新しいトークンが保存されている
      expect(decrypt(installation.accessTokenEnc)).toBe("new-access-token");
      expect(decrypt(installation.refreshTokenEnc)).toBe("new-refresh-token");
    });

    it("should add second channel to existing guild installation", async () => {
      // Arrange - 既存のインストールを作成
      const existingInstallationId = "existing-installation-id";
      await db.insert(discordInstallationsTable).values({
        id: existingInstallationId,
        organizationId: testOrgId,
        guildId: testGuildId,
        guildName: "Test Guild Name",
        botUserId: "test-bot-user-id",
        accessTokenEnc: encrypt("existing-access-token"),
        refreshTokenEnc: encrypt("existing-refresh-token"),
        expiresAt: new Date(Date.now() + 3600000), // 1時間後
      });

      // 既存のチャンネルを作成
      await db.insert(discordChannelsTable).values({
        id: "existing-channel-id",
        installationId: existingInstallationId,
        channelId: "existing-channel-id",
        channelName: "Existing Channel",
        webhookId: "existing-webhook-id",
        webhookTokenEnc: encrypt("existing-webhook-token"),
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

      const params = {
        organizationId: testOrgId,
        code: testCode,
        guildId: testGuildId,
        redirectUri: testRedirectUri,
      };

      // Act
      const result = await registerDiscordChannel(db, params);

      // Assert
      expect(result).toEqual({
        installationId: existingInstallationId,
        guildId: testGuildId,
        botUserId: "test-bot-user-id",
        channelId: "second-channel-id",
        webhookId: "second-webhook-id",
        webhookToken: mockTokenResponse.webhook,
      });

      // インストールは1つのまま、トークンが更新されている
      const installations = await db.select().from(discordInstallationsTable);
      expect(installations).toHaveLength(1);
      const installation = installations[0]!;
      expect(installation.id).toBe(existingInstallationId);
      expect(decrypt(installation.accessTokenEnc)).toBe("updated-access-token");
      expect(decrypt(installation.refreshTokenEnc)).toBe(
        "updated-refresh-token"
      );

      // チャンネルが2つになっている
      const channels = await db.select().from(discordChannelsTable);
      expect(channels).toHaveLength(2);

      // 既存チャンネルが残っている
      const existingChannel = channels.find(
        (c) => c.channelId === "existing-channel-id"
      );
      expect(existingChannel).toBeDefined();
      expect(existingChannel!.channelName).toBe("Existing Channel");

      // 新しいチャンネルが追加されている
      const newChannel = channels.find(
        (c) => c.channelId === "second-channel-id"
      );
      expect(newChannel).toBeDefined();
      expect(newChannel!).toMatchObject({
        installationId: existingInstallationId,
        channelId: "second-channel-id",
        channelName: "Second Channel",
        webhookId: "second-webhook-id",
      });
      expect(decrypt(newChannel!.webhookTokenEnc!)).toBe(
        "second-webhook-token"
      );
    });

    it("should handle missing guild info from token response", async () => {
      // Arrange
      const mockTokenResponse = {
        access_token: "test-access-token",
        refresh_token: "test-refresh-token",
        expires_in: 3600,
        scope: "bot",
        // guild info なし
        bot: {
          id: "test-bot-user-id",
        },
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

      // Act
      const result = await registerDiscordChannel(db, params);

      // Assert
      expect(result.guildId).toBe(testGuildId); // パラメータから取得

      const installations = await db.select().from(discordInstallationsTable);
      expect(installations[0]).toMatchObject({
        guildId: testGuildId,
        guildName: "", // デフォルト値
      });
    });
  });

  describe("エラー処理", () => {
    it("should throw error when Discord OAuth fails", async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => "Bad Request",
      });

      const params = {
        organizationId: testOrgId,
        code: "invalid-code",
        guildId: testGuildId,
        redirectUri: testRedirectUri,
      };

      // Act & Assert
      await expect(registerDiscordChannel(db, params)).rejects.toThrow(
        "Token exchange failed"
      );

      // データベースにレコードが作成されていないことを確認
      const installations = await db.select().from(discordInstallationsTable);
      expect(installations).toHaveLength(0);
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
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockTokenResponse,
      });

      const params = {
        organizationId: "non-existent-org-id",
        code: testCode,
        guildId: testGuildId,
        redirectUri: testRedirectUri,
      };

      // Act & Assert
      await expect(registerDiscordChannel(db, params)).rejects.toThrow(); // 外部キー制約エラー
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
      await expect(registerDiscordChannel(db, params)).rejects.toThrow(
        "Network error"
      );
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

      const params = {
        organizationId: testOrgId,
        code: testCode,
        guildId: testGuildId,
        redirectUri: testRedirectUri,
      };

      // Act
      await registerDiscordChannel(db, params);

      // Assert
      const installations = await db.select().from(discordInstallationsTable);
      const channels = await db.select().from(discordChannelsTable);

      // 平文トークンがデータベースに保存されていないことを確認
      const installation = installations[0]!;
      const channel = channels[0]!;
      expect(installation.accessTokenEnc).not.toBe("sensitive-access-token");
      expect(installation.refreshTokenEnc).not.toBe("sensitive-refresh-token");
      expect(channel.webhookTokenEnc).not.toBe("sensitive-webhook-token");

      // 復号化すると元のトークンが取得できることを確認
      expect(decrypt(installation.accessTokenEnc)).toBe(
        "sensitive-access-token"
      );
      expect(decrypt(installation.refreshTokenEnc)).toBe(
        "sensitive-refresh-token"
      );
      expect(decrypt(channel.webhookTokenEnc!)).toBe("sensitive-webhook-token");
    });

    it("should set correct expiration time", async () => {
      // Arrange
      const mockTokenResponse = {
        access_token: "test-access-token",
        refresh_token: "test-refresh-token",
        expires_in: 3600, // 1時間
        scope: "bot",
        guild: { id: testGuildId, name: "Test Guild" },
        bot: { id: "test-bot-id" },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockTokenResponse,
      });

      const beforeTime = Date.now();

      const params = {
        organizationId: testOrgId,
        code: testCode,
        guildId: testGuildId,
        redirectUri: testRedirectUri,
      };

      // Act
      await registerDiscordChannel(db, params);

      const afterTime = Date.now();

      // Assert
      const installations = await db.select().from(discordInstallationsTable);
      const installation = installations[0]!;
      const expiresAt = new Date(installation.expiresAt).getTime();

      // 有効期限が現在時刻 + 3600秒 (±10秒の誤差) であることを確認
      expect(expiresAt).toBeGreaterThan(beforeTime + 3600000 - 10000);
      expect(expiresAt).toBeLessThan(afterTime + 3600000 + 10000);
    });
  });
});
