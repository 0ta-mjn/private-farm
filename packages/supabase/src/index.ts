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
  // Bearerトークンを使用してユーザー情報を取得
  const { data, error } = await supabase.auth.getUser(token);
  if (error) {
    switch (error.code) {
      case "user_not_found":
      case "token_expired":
      case "invalid_token":
      case "invalid_jwt":
      case "invalid_grant":
      case "invalid_request":
      case "unauthorized":
        console.warn("Invalid or expired token:", error.message);
        return null;
      default:
        throw error;
    }
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

/**
 * Supabaseからユーザーを削除する関数
 * 管理者権限が必要なため、Service Role Keyを使用したクライアントで実行する必要があります
 */
export const deleteSupabaseUser = async (
  supabase: Supabase,
  userId: string
): Promise<void> => {
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) {
    throw error;
  }
};

export type { User, AuthError } from "@supabase/supabase-js";
