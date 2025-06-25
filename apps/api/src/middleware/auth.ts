import { createMiddleware } from "hono/factory";
import { validateToken } from "@repo/supabase";
import { HTTPException } from "hono/http-exception";
import { HonoEnv } from "../env";

/**
 * Middleware to authenticate requests using Supabase JWT tokens.
 */
export const authMiddleware = createMiddleware<HonoEnv>(async (c, next) => {
  // Extract the token from the Authorization header
  const authHeader = c.req.header("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "");
  if (!token) {
    throw new HTTPException(401, {
      message: "Unauthorized: No authorization header provided",
    });
  }

  // Validate the token and get the session
  try {
    const session = await validateToken(c.var.supabase, token);
    if (!session || !session.user) {
      throw new HTTPException(401, {
        message: "Unauthorized: Invalid or expired session token",
      });
    }
    // Attach the session to the context
    c.set("session", session);
    c.set("userId", session.user.id);
    return next();
  } catch (error) {
    console.error("Error validating token:", error);
    if (error instanceof HTTPException) {
      throw error; // Re-throw if it's already an HTTPException
    }
    throw new HTTPException(401, {
      message: "Unauthorized: Invalid or expired session token",
    });
  }
});
