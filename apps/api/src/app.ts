import { dbClient } from "@repo/db/client";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { timingMiddleware } from "./middleware/util";
import { HonoEnv } from "./env";
import { authMiddleware } from "./middleware/auth";
import { organizationRoute } from "./routes/organization";
import { env } from "hono/adapter";
import { HTTPException } from "hono/http-exception";
import { userRoute } from "./routes/user";
import { thingRoute } from "./routes/thing";
import { diaryRoute } from "./routes/diary";
import { discordRoute } from "./routes/discord";
import { getAuth } from "./auth";
import { except } from "hono/combine";

const app = new Hono<HonoEnv>()
  .use((c, next) => {
    const {
      DATABASE_URL,
      DISCORD_CLIENT_ID,
      DISCORD_CLIENT_SECRET,
      DISCORD_BOT_TOKEN,
      DISCORD_ENCRYPTION_KEY,
    } = env<{
      DATABASE_URL: string | undefined;
      DISCORD_CLIENT_ID: string | undefined;
      DISCORD_CLIENT_SECRET: string | undefined;
      DISCORD_BOT_TOKEN: string | undefined;
      DISCORD_ENCRYPTION_KEY: string | undefined;
      ACCEPT_ORIGINS: string | undefined;
    }>(c);
    if (!DATABASE_URL) {
      throw new HTTPException(500, {
        message: "Database URL is not set in environment variables.",
      });
    }
    if (
      !DISCORD_CLIENT_ID ||
      !DISCORD_CLIENT_SECRET ||
      !DISCORD_BOT_TOKEN ||
      !DISCORD_ENCRYPTION_KEY
    ) {
      throw new HTTPException(500, {
        message: "Discord configuration is not set in environment variables.",
      });
    }
    const db = dbClient(DATABASE_URL);
    c.set("db", db);
    c.set("auth", getAuth(c));
    c.set("discordKeys", {
      discordClientId: DISCORD_CLIENT_ID,
      discordClientSecret: DISCORD_CLIENT_SECRET,
      discordBotToken: DISCORD_BOT_TOKEN,
      encryptionKey: DISCORD_ENCRYPTION_KEY,
    });
    return next();
  })
  .use(
    cors({
      origin: (origin, c) => {
        const { ACCEPT_ORIGINS } = env<{ ACCEPT_ORIGINS: string | undefined }>(
          c
        );
        if (ACCEPT_ORIGINS) {
          const allowedOrigins = ACCEPT_ORIGINS.split(",");
          if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
            console.log("CORS Origin:", origin, ACCEPT_ORIGINS);
            return origin; // オリジンが許可されている場合はそのまま返す
          }
        } else if (process.env.NODE_ENV === "development") {
          // 開発環境では全てのオリジンを許可
          return origin; // 開発環境では全てのオリジンを許可
        }
        throw new HTTPException(403, {
          message:
            "CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.",
        }); // オリジンが許可されていない場合はエラーを返す
      },
      allowMethods: [
        "GET",
        "HEAD",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS",
      ],
      allowHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    })
  )
  .use(timingMiddleware, except("/auth/*", authMiddleware))
  .route("/user", userRoute)
  .route("/organization", organizationRoute)
  .route("/thing", thingRoute)
  .route("/diary", diaryRoute)
  .route("/discord", discordRoute)
  .onError((err, c) => {
    console.error("Error occurred:", err);
    if (err instanceof HTTPException) {
      return err.getResponse();
    }
    return c.newResponse("Internal Server Error", 500);
  });

export default app;
