import { AuthProvider } from "./interface";
import { SupabaseAuthProvider, SupabaseAuthProviderConfig } from "./providers";

export type AuthProviderConfig = SupabaseAuthProviderConfig;

export const getAuthProvider = (config: AuthProviderConfig): AuthProvider => {
  switch (config.provider) {
    case "supabase":
      return new SupabaseAuthProvider(config.config)
    default:
      throw new Error(`Unsupported auth provider: ${config.provider}`);
  }
};
