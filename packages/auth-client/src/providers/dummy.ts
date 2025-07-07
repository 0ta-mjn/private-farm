/* eslint-disable @typescript-eslint/no-unused-vars */
import { AuthError } from "../errors";
import {
  AuthProvider,
  AuthSession,
  AuthUser,
  AuthUserIdentity,
  OAuthSigninUrlInput,
  ResetPasswordForEmailInput,
  ResetPasswordInput,
  SignInInput,
  SignUpInput,
  SupportedOAuthProvider,
  UpdateEmailInput,
  UpdatePasswordInput,
  VerifyCodeInput,
} from "../interface";

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
  private identities: Map<string, AuthUserIdentity[]> = new Map();
  private accessTokens: Map<string, TokenData> = new Map();
  private refreshTokens: Map<string, TokenData> = new Map();
  private currentSession: AuthSession | null = null;
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

    // デフォルトのアイデンティティを追加
    this.identities.set(defaultUser.id, [
      {
        provider: "email",
        email: defaultUser.email,
        name: defaultUser.name,
      },
    ]);

    // デフォルトのトークンを追加
    const now = Date.now();
    const defaultSession = this.createSession(defaultUser);
    this.currentSession = defaultSession;
  }

  async refreshToken(token: string): Promise<AuthSession | null> {
    await this.simulateDelay();

    if (!this.options.shouldSucceed) {
      throw new AuthError("token_expired", "Token refresh failed");
    }

    // リフレッシュトークンを確認
    const refreshTokenData = this.refreshTokens.get(token);
    if (!refreshTokenData) {
      throw new AuthError("invalid_token", "Invalid refresh token provided");
    }

    // リフレッシュトークンの有効期限をチェック
    if (Date.now() > refreshTokenData.expiresAt) {
      this.refreshTokens.delete(token);
      throw new AuthError("token_expired", "Refresh token has expired");
    }

    const user = refreshTokenData.user;

    // 新しいトークンペアを生成
    const now = Date.now();
    const newAccessToken = `access-${now}-${Math.random().toString(36).substring(7)}`;
    const newRefreshToken = `refresh-${now}-${Math.random().toString(36).substring(7)}`;

    // 新しいアクセストークンを追加
    this.accessTokens.set(newAccessToken, {
      user,
      expiresAt: now + ACCESS_TOKEN_EXPIRY_MS,
      type: "access",
    });

    // 新しいリフレッシュトークンを追加
    this.refreshTokens.set(newRefreshToken, {
      user,
      expiresAt: now + REFRESH_TOKEN_EXPIRY_MS,
      type: "refresh",
    });

    // 古いリフレッシュトークンを削除
    this.refreshTokens.delete(token);

    const newSession = {
      user,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresAt: now + ACCESS_TOKEN_EXPIRY_MS,
    };

    this.currentSession = newSession;
    return newSession;
  }

  async getUser(): Promise<AuthUser | null> {
    await this.simulateDelay();

    if (!this.options.shouldSucceed) {
      throw new AuthError("unknown_error", "Failed to get user");
    }

    return this.currentSession?.user || null;
  }

  async getSession(): Promise<AuthSession | null> {
    await this.simulateDelay();

    if (!this.options.shouldSucceed) {
      throw new AuthError("unknown_error", "Failed to get session");
    }

    return this.currentSession;
  }

  async getIdentities(): Promise<AuthUserIdentity[]> {
    await this.simulateDelay();

    if (!this.options.shouldSucceed) {
      throw new AuthError("unknown_error", "Failed to get identities");
    }

    if (!this.currentSession) {
      return [];
    }

    return this.identities.get(this.currentSession.user.id) || [];
  }

  async signIn(input: SignInInput): Promise<AuthSession | null> {
    await this.simulateDelay();

    if (!this.options.shouldSucceed) {
      throw new AuthError("unknown_error", "Sign-in failed");
    }

    if (input.provider === "email") {
      // テスト用の認証情報をチェック
      if (
        input.input.email === "test@example.com" &&
        input.input.password === "password123"
      ) {
        const user = Array.from(this.users.values()).find(
          (u) => u.email === input.input.email
        );
        if (user) {
          const session = this.createSession(user);
          this.currentSession = session;
          return session;
        }
      }
    }

    return null;
  }

  async verifyCode(_input: VerifyCodeInput): Promise<AuthSession | null> {
    await this.simulateDelay();

    if (!this.options.shouldSucceed) {
      throw new AuthError("unknown_error", "Email verification failed");
    }

    // トークンの検証（ここではダミー実装）
    const user = Array.from(this.users.values())[0];
    if (!user) {
      throw new AuthError("invalid_token", "Invalid verification code");
    }
    const session = this.createSession(user);
    this.currentSession = session;
    return session;
  }

  async signUp(input: SignUpInput): Promise<AuthUser | null> {
    await this.simulateDelay();

    if (!this.options.shouldSucceed) {
      throw new AuthError("unknown_error", "Sign-up failed");
    }

    if (input.provider === "email") {
      // 新しいユーザーを作成
      const newUser: AuthUser = {
        id: `user-${Date.now()}`,
        email: input.input.email,
        name: input.input.email.split("@")[0],
        isEmailVerified: false,
      };

      this.users.set(newUser.id, newUser);
      const session = this.createSession(newUser);
      this.currentSession = session;
      return newUser;
    }

    return null;
  }

  async signOut(): Promise<void> {
    await this.simulateDelay();

    if (!this.options.shouldSucceed) {
      throw new AuthError("unknown_error", "Sign-out failed");
    }

    if (!this.currentSession) {
      return;
    }

    // アクセストークンを削除
    this.accessTokens.delete(this.currentSession.accessToken);
    
    // リフレッシュトークンも削除
    if (this.currentSession.refreshToken) {
      this.refreshTokens.delete(this.currentSession.refreshToken);
    }

    this.currentSession = null;
  }

  async updateEmail(
    input: UpdateEmailInput
  ) {
    await this.simulateDelay();

    if (!this.options.shouldSucceed) {
      throw new AuthError("unknown_error", "Email update failed");
    }

    // Dummy implementation - 実際の実装では現在のユーザーを取得して更新する
    return {
      isSentVerificationEmail: true, // 仮にメール送信が成功したという前提
    };
  }

  async sendResetPassword(
    input: ResetPasswordForEmailInput
  ): Promise<void> {
    await this.simulateDelay();

    if (!this.options.shouldSucceed) {
      throw new AuthError("unknown_error", "Password reset email failed");
    }

    // Dummy implementation - パスワードリセットメール送信のシミュレーション
  }

  async updatePassword(
    input: UpdatePasswordInput
  ): Promise<void> {
    await this.simulateDelay();

    if (!this.options.shouldSucceed) {
      throw new AuthError("unknown_error", "Password update failed");
    }

    // Dummy implementation - パスワード更新のシミュレーション
  }

  async resetPassword(_input: ResetPasswordInput): Promise<void> {
    await this.simulateDelay();

    if (!this.options.shouldSucceed) {
      throw new AuthError("unknown_error", "Password reset failed");
    }
  }

  async redirectOAuthSigninUrl(
    provider: SupportedOAuthProvider,
    input: OAuthSigninUrlInput
  ): Promise<void> {
    await this.simulateDelay();

    if (!this.options.shouldSucceed) {
      throw new AuthError(
        "unknown_error",
        "OAuth signin URL generation failed"
      );
    }

    // Dummy implementation - 実際の実装ではリダイレクトを行う
    console.log(`Redirecting to OAuth for ${provider}`, input);
  }

  async linkOAuthProvider(
    provider: SupportedOAuthProvider,
    input: OAuthSigninUrlInput
  ): Promise<void> {
    await this.simulateDelay();

    if (!this.options.shouldSucceed) {
      throw new AuthError("unknown_error", "OAuth provider linking failed");
    }

    // Dummy implementation - OAuth プロバイダーとのリンク
    console.log(`Linking OAuth provider ${provider}`, input);
  }

  async unlinkOAuthProvider(provider: SupportedOAuthProvider): Promise<void> {
    await this.simulateDelay();

    if (!this.options.shouldSucceed) {
      throw new AuthError("unknown_error", "OAuth unlink failed");
    }

    // Dummy implementation - OAuth プロバイダーとのリンク解除
    console.log(`Unlinking OAuth provider ${provider}`);
  }

  onAuthStateChange(
    callback: (session: AuthSession | null, event?: string) => void
  ): () => void {
    // Dummy implementation - 状態変化の監視
    // 実際の実装では、認証状態の変化を監視して callback を呼び出す
    
    // 初回は現在のセッションを通知
    setTimeout(() => {
      callback(this.currentSession, "INITIAL_SESSION");
    }, 0);

    // クリーンアップ関数を返す
    return () => {
      // Dummy implementation - リスナーの削除
      console.log("Auth state change listener removed");
    };
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

  private createSession(user: AuthUser): AuthSession {
    const now = Date.now();
    const accessToken = `access-${now}-${Math.random().toString(36).substring(7)}`;
    const refreshToken = `refresh-${now}-${Math.random().toString(36).substring(7)}`;

    // トークンを保存
    this.accessTokens.set(accessToken, {
      user,
      expiresAt: now + ACCESS_TOKEN_EXPIRY_MS,
      type: "access",
    });

    this.refreshTokens.set(refreshToken, {
      user,
      expiresAt: now + REFRESH_TOKEN_EXPIRY_MS,
      type: "refresh",
    });

    return {
      user,
      accessToken,
      refreshToken,
      expiresAt: now + ACCESS_TOKEN_EXPIRY_MS,
    };
  }

  private async simulateDelay(): Promise<void> {
    if (this.options.delay && this.options.delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.options.delay));
    }
  }
}
