import { Hono } from "hono";
import { parseRequest } from "./parser/chirpstack";

const app = new Hono<{
  Bindings: Env;
}>().post("/", async (c) => {
  c.executionCtx.waitUntil(
    parseRequest(c.req)
      .then(async (data) => {
        if (!data) return;
        await c.env.SensorIngestQueue.send(data);
      })
      .catch((err) => console.error("Error processing request:", err))
  );
  return c.text("Data received and queued", 200);
});

export default app;
