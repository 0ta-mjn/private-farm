import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import type { AppRouter } from "@repo/api";
import { supabase } from "../lib/supabase";
import superjson from "superjson";

if (!process.env.NEXT_PUBLIC_API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is not defined");
}

export const { TRPCProvider, useTRPC, useTRPCClient } =
  createTRPCContext<AppRouter>();

// バニラtRPCクライアント
export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${process.env.NEXT_PUBLIC_API_URL}/trpc`,
      maxURLLength: 5000,
      headers: async () => {
        // Supabaseセッションからトークンを取得
        const {
          data: { session },
        } = await supabase.auth.getSession();
        return {
          authorization: session?.access_token
            ? `Bearer ${session.access_token}`
            : "",
        };
      },
      transformer: superjson,
    }),
  ],
});
