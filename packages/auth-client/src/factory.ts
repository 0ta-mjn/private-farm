import { z } from "zod";
import { AuthProvider } from "./interface";
import { SupabaseAuthProvider, SupabaseAuthProviderConfig } from "./providers";

export type ProviderConfig = SupabaseAuthProviderConfig;

export const ProviderNameSchema = z.enum(["supabase"]) satisfies z.ZodType<
  ProviderConfig["provider"]
>;
export type ProviderName = z.infer<typeof ProviderNameSchema>;

export const getAuthProvider = (config: ProviderConfig): AuthProvider => {
  switch (config.provider) {
    case "supabase":
      return new SupabaseAuthProvider(config.config);
    default:
      throw new Error(`Unsupported auth provider: ${config.provider}`);
  }
};
