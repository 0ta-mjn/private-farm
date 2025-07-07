import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { DummyAuthProvider } from "@repo/auth-admin";
import { authMiddleware } from "./auth";
import { HonoEnv } from "../env";
import {
  AUTH_ACCESS_TOKEN_COOKIE,
  AUTH_REFRESH_TOKEN_COOKIE,
} from "@repo/config";

const authProvider = new DummyAuthProvider({});

const app = new Hono<HonoEnv>()
  .use("*", async (c, next) => {
    c.set("auth", authProvider);
    await next();
  })
  .use("/protected/*", authMiddleware)
  .get("/protected/test", (c) => {
    const userId = c.get("userId");
    return c.json({ message: "success", userId });
  });

describe("authMiddleware", () => {
  beforeEach(() => {
    // 各テスト前にプロバイダーをクリア
    authProvider.clear();

    // デフォルトのテストユーザーを再追加
    const defaultUser = {
      id: "test-user-1",
      email: "test@example.com",
      name: "Test User",
      isEmailVerified: true,
    };
    authProvider.addUser(defaultUser);
    authProvider.addToken("test-token", defaultUser);
  });
  describe("valid token", () => {
    it("should allow access with valid token", async () => {
      const res = await app.request("/protected/test", {
        headers: {
          Cookie: `${AUTH_ACCESS_TOKEN_COOKIE}=test-token`,
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({
        message: "success",
        userId: "test-user-1",
      });
    });

    it("should set userId in context", async () => {
      // 新しいユーザーとトークンを追加
      const customUser = {
        id: "custom-user-id",
        email: "custom@example.com",
        name: "Custom User",
        isEmailVerified: true,
      };
      authProvider.addUser(customUser);
      authProvider.addToken("custom-token", customUser);

      const res = await app.request("/protected/test", {
        headers: {
          Cookie: `${AUTH_ACCESS_TOKEN_COOKIE}=custom-token`,
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.userId).toBe("custom-user-id");
    });
  });

  describe("missing access token cookie", () => {
    it("should return 401 when no access token cookie", async () => {
      const res = await app.request("/protected/test");

      expect(res.status).toBe(401);
    });

    it("should return 401 when access token cookie is empty", async () => {
      const res = await app.request("/protected/test", {
        headers: {
          Cookie: `${AUTH_ACCESS_TOKEN_COOKIE}=`,
        },
      });

      expect(res.status).toBe(401);
    });
  });

  describe("token validation", () => {
    it("should return 401 when token is invalid", async () => {
      const res = await app.request("/protected/test", {
        headers: {
          Cookie: `${AUTH_ACCESS_TOKEN_COOKIE}=invalid-token`,
        },
      });

      expect(res.status).toBe(401);
    });

    it("should allow access with valid token in cookie", async () => {
      const res = await app.request("/protected/test", {
        headers: {
          Cookie: `${AUTH_ACCESS_TOKEN_COOKIE}=test-token`,
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.userId).toBe("test-user-1");
    });
  });

  describe("invalid token", () => {
    it("should return 401 when token is invalid", async () => {
      const res = await app.request("/protected/test", {
        headers: {
          Cookie: `${AUTH_ACCESS_TOKEN_COOKIE}=invalid-token`,
        },
      });

      expect(res.status).toBe(401);
    });

    it("should return 401 when validateToken returns null", async () => {
      // shouldSucceedをfalseに設定したproviderを使用
      const failingAuthProvider = new DummyAuthProvider({
        shouldSucceed: false,
      });

      const failingApp = new Hono<HonoEnv>();
      failingApp.use("*", async (c, next) => {
        c.set("auth", failingAuthProvider);
        await next();
      });
      failingApp.use("/protected/*", authMiddleware);
      failingApp.get("/protected/test", (c) => c.json({ message: "success" }));

      const res = await failingApp.request("/protected/test", {
        headers: {
          Cookie: `${AUTH_ACCESS_TOKEN_COOKIE}=test-token`,
        },
      });

      expect(res.status).toBe(401);
    });
  });

  describe("auth provider errors", () => {
    it("should handle auth provider throwing an error", async () => {
      // validateTokenがエラーを投げるproviderを作成
      const errorAuthProvider = new DummyAuthProvider();
      errorAuthProvider.validateToken = async () => {
        throw new Error("Auth service unavailable");
      };

      const errorApp = new Hono<HonoEnv>();
      errorApp.use("*", async (c, next) => {
        c.set("auth", errorAuthProvider);
        await next();
      });
      errorApp.use("/protected/*", authMiddleware);
      errorApp.get("/protected/test", (c) => c.json({ message: "success" }));

      const res = await errorApp.request("/protected/test", {
        headers: {
          Cookie: `${AUTH_ACCESS_TOKEN_COOKIE}=test-token`,
        },
      });

      expect(res.status).toBe(401);
    });

    it("should re-throw HTTPException from auth provider", async () => {
      // validateTokenがHTTPExceptionを投げるproviderを作成
      const httpExceptionAuthProvider = new DummyAuthProvider({
        shouldSucceed: false,
      });

      const httpExceptionApp = new Hono<HonoEnv>();
      httpExceptionApp.use("*", async (c, next) => {
        c.set("auth", httpExceptionAuthProvider);
        await next();
      });
      httpExceptionApp.use("/protected/*", authMiddleware);
      httpExceptionApp.get("/protected/test", (c) =>
        c.json({ message: "success" })
      );

      const res = await httpExceptionApp.request("/protected/test", {
        headers: {
          Cookie: `${AUTH_ACCESS_TOKEN_COOKIE}=test-token`,
        },
      });

      expect(res.status).toBe(401);
    });
  });

  describe("token refresh", () => {
    it("should refresh token when access token is expired but refresh token is valid", async () => {
      // 期限切れのアクセストークンを持つユーザーを作成
      const testUser = {
        id: "test-user-refresh",
        email: "refresh@example.com",
        name: "Refresh User",
        isEmailVerified: true,
      };

      // 期限切れのトークンを手動で追加（過去の日時で期限設定）
      const expiredAccessToken = "expired-access-token";
      const validRefreshToken = "valid-refresh-token";

      // カスタムプロバイダーを作成してトークンを直接操作
      const refreshTestProvider = new DummyAuthProvider();
      refreshTestProvider.clear();
      refreshTestProvider.addUser(testUser);

      // 期限切れのアクセストークンを追加（内部のMapに直接アクセス）
      refreshTestProvider["accessTokens"].set(expiredAccessToken, {
        user: testUser,
        expiresAt: Date.now() - 1000, // 1秒前に期限切れ
        type: "access",
      });

      // 有効なリフレッシュトークンを追加
      refreshTestProvider["refreshTokens"].set(validRefreshToken, {
        user: testUser,
        expiresAt: Date.now() + 86400000 * 7, // 7日後
        type: "refresh",
      });

      const refreshApp = new Hono<HonoEnv>()
        .use("*", async (c, next) => {
          c.set("auth", refreshTestProvider);
          await next();
        })
        .use("/protected/*", authMiddleware)
        .get("/protected/test", (c) => {
          const userId = c.get("userId");
          return c.json({ message: "success", userId });
        });

      const res = await refreshApp.request("/protected/test", {
        headers: {
          Cookie: `${AUTH_ACCESS_TOKEN_COOKIE}=${expiredAccessToken}; ${AUTH_REFRESH_TOKEN_COOKIE}=${validRefreshToken}`,
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.userId).toBe("test-user-refresh");

      // 新しいトークンがCookieに設定されているかチェック
      const cookies = res.headers.get("Set-Cookie");
      expect(cookies).toContain(AUTH_ACCESS_TOKEN_COOKIE);
      expect(cookies).toContain(AUTH_REFRESH_TOKEN_COOKIE);
    });

    it("should return 401 when both access and refresh tokens are invalid", async () => {
      const res = await app.request("/protected/test", {
        headers: {
          Cookie: `${AUTH_ACCESS_TOKEN_COOKIE}=invalid-access; ${AUTH_REFRESH_TOKEN_COOKIE}=invalid-refresh`,
        },
      });

      expect(res.status).toBe(401);
    });

    it("should return 401 when refresh token is expired", async () => {
      const testUser = {
        id: "test-user-expired-refresh",
        email: "expired-refresh@example.com",
        name: "Expired Refresh User",
        isEmailVerified: true,
      };

      const expiredRefreshProvider = new DummyAuthProvider();
      expiredRefreshProvider.clear();
      expiredRefreshProvider.addUser(testUser);

      // 期限切れのアクセストークンと期限切れのリフレッシュトークンを追加
      expiredRefreshProvider["accessTokens"].set("expired-access", {
        user: testUser,
        expiresAt: Date.now() - 1000,
        type: "access",
      });

      expiredRefreshProvider["refreshTokens"].set("expired-refresh", {
        user: testUser,
        expiresAt: Date.now() - 1000, // 期限切れ
        type: "refresh",
      });

      const expiredApp = new Hono<HonoEnv>()
        .use("*", async (c, next) => {
          c.set("auth", expiredRefreshProvider);
          await next();
        })
        .use("/protected/*", authMiddleware)
        .get("/protected/test", (c) => {
          const userId = c.get("userId");
          return c.json({ message: "success", userId });
        });

      const res = await expiredApp.request("/protected/test", {
        headers: {
          Cookie: `${AUTH_ACCESS_TOKEN_COOKIE}=expired-access; ${AUTH_REFRESH_TOKEN_COOKIE}=expired-refresh`,
        },
      });

      expect(res.status).toBe(401);
    });
  });
});
