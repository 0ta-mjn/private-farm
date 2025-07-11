import { serve } from "@hono/node-server";
import { Hono } from "hono";

const app = new Hono();

app.post("/", async (c) => {
  console.log(
    "Received POST request with body:",

    JSON.stringify(await c.req.json(), null, 2)
  );
  return c.text("Hello Hono!");
});

serve(
  {
    fetch: app.fetch,
    port: 10000,
  },
  (info) => {
    console.log(`Server is running on http://127.0.0.1:${info.port}`);
  }
);
