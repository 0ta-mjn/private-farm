import {
  fastifyTRPCPlugin,
  FastifyTRPCPluginOptions,
} from "@trpc/server/adapters/fastify";
import fastify from "fastify";
import { appRouter, type AppRouter, createTRPCContext } from "@repo/api";
import { dbClient } from "@repo/db/client";
import { supaClient } from "@repo/supabase";

if (!process.env.DATABASE_URL) {
  throw new Error("Missing DATABASE_URL environment variable");
}

const db = dbClient(process.env.DATABASE_URL);

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_KEY environment variable");
}
const supabase = supaClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const server = fastify({
  maxParamLength: 5000,
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
