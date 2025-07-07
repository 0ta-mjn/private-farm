import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { DummyAuthProvider } from "@repo/auth-admin";
import { authMiddleware } from "./auth";
import { HonoEnv } from "../env";

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
          Authorization: `Bearer test-token`,
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
          Authorization: `Bearer custom-token`,
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
          Authorization: `Bearer `,
        },
      });

      expect(res.status).toBe(401);
    });
  });

  describe("token validation", () => {
    it("should return 401 when token is invalid", async () => {
      const res = await app.request("/protected/test", {
        headers: {
          Authorization: `Bearer invalid-token`,
        },
      });

      expect(res.status).toBe(401);
    });

    it("should allow access with valid token in cookie", async () => {
      const res = await app.request("/protected/test", {
        headers: {
          Authorization: `Bearer test-token`,
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
          Authorization: `Bearer invalid-token`,
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
          Authorization: `Bearer test-token`,
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
          Authorization: `Bearer test-token`,
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
          Authorization: `Bearer test-token`,
        },
      });

      expect(res.status).toBe(401);
    });
  });
});
