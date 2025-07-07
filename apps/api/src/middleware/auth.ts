import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { HonoEnv } from "../env";
import { Context } from "hono";

export const getUserFromToken = async (c: Context<HonoEnv>) => {
  // Extract the token from the Authorization header
  const authHeader = c.req.header("authorization");
  const accessToken = authHeader?.replace(/^Bearer\s+/i, "");
  if (!accessToken) {
    throw new HTTPException(401, {
      message: "Unauthorized: No authorization header provided",
    });
  }

  const session = await c.var.auth.validateToken(accessToken);
  return session;
};

/**
 * Middleware to authenticate requests using Supabase JWT tokens.
 */
export const authMiddleware = createMiddleware<HonoEnv>(async (c, next) => {
  // Validate the token and get the session
  try {
    const user = await getUserFromToken(c);

    if (!user) {
      throw new HTTPException(401, {
        message: "Unauthorized: Invalid or expired session token",
      });
    }

    // Attach the session to the context
    c.set("userId", user.id);
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
