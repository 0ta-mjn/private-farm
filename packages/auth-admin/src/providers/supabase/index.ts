import {
  createClient,
  SupabaseClient,
} from "@supabase/supabase-js";
import { AuthProvider } from "../../interface";
import { validateToken, getSupabaseUser, deleteSupabaseUser } from "./user";

export type SupabaseAuthProviderConfig = {
  provider: "supabase";
  config: {
    supabaseUrl: string;
    supabaseKey: string;
  };
};

export class SupabaseAuthProvider implements AuthProvider {
  supabase: SupabaseClient;
  constructor({
    supabaseKey,
    supabaseUrl,
  }: SupabaseAuthProviderConfig["config"]) {
    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        flowType: "pkce",
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  }

  validateToken(accessToken: string) {
    return validateToken(this.supabase, accessToken);
  }

  deleteUser(userId: string) {
    return deleteSupabaseUser(this.supabase, userId);
  }

  getUser(userId: string) {
    return getSupabaseUser(this.supabase, userId);
  }
}
