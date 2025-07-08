import {
  ProviderConfig,
  ProviderName,
  ProviderNameSchema,
  getAuthProvider,
} from "@repo/auth-client";

const authProvider: ProviderName =
  ProviderNameSchema.safeParse(process.env.NEXT_PUBLIC_AUTH_PROVIDER).data ||
  "supabase";

let config: ProviderConfig;
switch (authProvider) {
  case "supabase":
  default: {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!SUPABASE_URL) {
      throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_URL");
    }

    if (!SUPABASE_ANON_KEY) {
      throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY");
    }
    config = {
      provider: "supabase",
      config: {
        supabaseUrl: SUPABASE_URL,
        supabaseAnonKey: SUPABASE_ANON_KEY,
      },
    };
  }
}

export const auth = getAuthProvider(config);
