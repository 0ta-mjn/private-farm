import { AuthError } from "../errors";
import { AuthProvider, AuthUser } from "../interface";

interface DummyAuthProviderOptions {
  shouldSucceed?: boolean;
  mockUser?: Partial<AuthUser>;
  delay?: number;
}

interface TokenData {
  user: AuthUser;
  expiresAt: number;
  type: "access" | "refresh";
}

// 定数
const ACCESS_TOKEN_EXPIRY_MS = 3600000; // 1時間
const REFRESH_TOKEN_EXPIRY_MS = 86400000 * 7; // 7日間

export class DummyAuthProvider implements AuthProvider {
  private users: Map<string, AuthUser> = new Map();
  private accessTokens: Map<string, TokenData> = new Map();
  private refreshTokens: Map<string, TokenData> = new Map();
  private options: DummyAuthProviderOptions;

  constructor(options: DummyAuthProviderOptions = {}) {
    this.options = {
      shouldSucceed: true,
      delay: 0,
      ...options,
    };

    // デフォルトのテストユーザーを追加
    const defaultUser: AuthUser = {
      id: "test-user-1",
      email: "test@example.com",
      name: "Test User",
      isEmailVerified: true,
      ...this.options.mockUser,
    };
    this.users.set(defaultUser.id, defaultUser);

    // デフォルトのトークンを追加
    const now = Date.now();
    this.accessTokens.set("test-token", {
      user: defaultUser,
      expiresAt: now + ACCESS_TOKEN_EXPIRY_MS,
      type: "access",
    });
    this.refreshTokens.set("test-refresh-token", {
      user: defaultUser,
      expiresAt: now + REFRESH_TOKEN_EXPIRY_MS,
      type: "refresh",
    });
  }

  async validateToken(accessToken: string): Promise<AuthUser | null> {
    await this.simulateDelay();

    if (!this.options.shouldSucceed) {
      throw new AuthError("invalid_token", "Token validation failed");
    }

    const tokenData = this.accessTokens.get(accessToken);
    if (!tokenData) {
      throw new AuthError("invalid_token", "Invalid access token");
    }

    // トークンの有効期限をチェック
    if (Date.now() > tokenData.expiresAt) {
      this.accessTokens.delete(accessToken);
      throw new AuthError("token_expired", "Access token has expired");
    }

    return tokenData.user;
  }

  async deleteUser(userId: string): Promise<void> {
    await this.simulateDelay();

    if (!this.options.shouldSucceed) {
      throw new AuthError("unknown_error", "User deletion failed");
    }

    this.users.delete(userId);

    // ユーザーに関連するすべてのトークンを削除
    for (const [token, tokenData] of this.accessTokens.entries()) {
      if (tokenData.user.id === userId) {
        this.accessTokens.delete(token);
      }
    }

    for (const [token, tokenData] of this.refreshTokens.entries()) {
      if (tokenData.user.id === userId) {
        this.refreshTokens.delete(token);
      }
    }
  }

  async getUser(userId: string): Promise<AuthUser | null> {
    await this.simulateDelay();

    if (!this.options.shouldSucceed) {
      throw new AuthError("unknown_error", "Failed to get user");
    }

    const user = this.users.get(userId);
    return user || null;
  }

  // テスト用のヘルパーメソッド
  addUser(user: AuthUser): void {
    this.users.set(user.id, user);
  }

  addToken(token: string, user: AuthUser): void {
    const now = Date.now();
    this.accessTokens.set(token, {
      user,
      expiresAt: now + ACCESS_TOKEN_EXPIRY_MS,
      type: "access",
    });
  }

  setOptions(options: DummyAuthProviderOptions): void {
    this.options = {
      ...this.options,
      ...options,
    };
  }

  clear(): void {
    this.users.clear();
    this.accessTokens.clear();
    this.refreshTokens.clear();
  }

  private async simulateDelay(): Promise<void> {
    if (this.options.delay && this.options.delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.options.delay));
    }
  }
}
