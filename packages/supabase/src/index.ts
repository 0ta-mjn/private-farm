import { createClient, SupabaseClient, User } from "@supabase/supabase-js";

export type Supabase = SupabaseClient;

// Supabaseクライアントの作成
export const supaClient = (
  supabaseUrl: string,
  supabaseKey: string
): Supabase => {
  return createClient(supabaseUrl, supabaseKey);
};

export interface Session {
  user: User;
  access_token: string;
}

export const validateToken = async (
  supabase: Supabase,
  token: string
): Promise<Session | null> => {
  const { data, error } = await supabase.auth.getUser(token);
  if (error) {
    throw error;
  }
  if (!data.user) {
    console.warn("No user found for the provided token.");
    return null;
  }
  return {
    user: data.user,
    access_token: token,
  };
};

export type { User, AuthError } from "@supabase/supabase-js";
