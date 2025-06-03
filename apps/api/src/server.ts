import {
  fastifyTRPCPlugin,
  FastifyTRPCPluginOptions,
} from "@trpc/server/adapters/fastify";
import fastify from "fastify";
import { appRouter, type AppRouter, createTRPCContext } from "@repo/api";
import { dbClient } from "@repo/db/client";
import { supaClient } from "@repo/supabase";
import cors from "@fastify/cors";

const db = dbClient();

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_KEY environment variable");
}
const supabase = supaClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const server = fastify({
  maxParamLength: 5000,
});

// 全てのオリジンを許可する場合
await server.register(cors, {
  origin: "*", // 本番環境ではドメインを絞るのが望ましい
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true, // Cookie も渡したい場合に true にする
});

server.register(fastifyTRPCPlugin, {
  prefix: "/trpc",
  trpcOptions: {
    router: appRouter,
    createContext: (p) => {
      return createTRPCContext({ ...p, db, supabase });
    },
    onError({ path, error }) {
      // report to error monitoring
      console.error(`Error in tRPC handler on path '${path}':`, error);
    },
  } satisfies FastifyTRPCPluginOptions<AppRouter>["trpcOptions"],
});

(async () => {
  try {
    const port = process.env.API_PORT
      ? parseInt(process.env.API_PORT, 10)
      : 3000;
    await server.listen({ port });
    console.log(`Server listening on port ${port}...`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
})();
