import { createMiddleware } from "hono/factory";

/**
 * Middleware for timing requests
 */
export const timingMiddleware = createMiddleware(async (c, next) => {
  const start = Date.now();

  if (process.env.NODE_ENV === "development") {
    // artificial delay in dev 100-500ms
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const end = Date.now();
  const path = c.req.path;
  console.log(`[API] ${path} took ${end - start}ms to execute`);

  return next();
});
