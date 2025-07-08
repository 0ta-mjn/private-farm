import { SupabaseClient, User } from "@supabase/supabase-js";
import { AuthUser } from "../../interface";
import { SupabaseErrorToAuthError } from "./error";

/**
 * SupabaseのUserオブジェクトをAuthUserに変換する関数
 * SupabaseのUserオブジェクトは、user_metadataに名前やフルネームを含むことがあるため、
 * それらを適切にマッピングしてAuthUser形式に変換します。
 */
export const SupabaseUserToAuthUser = (user: User): AuthUser => ({
  ...user,
  id: user.id,
  name:
    user.user_metadata["full_name"] ||
    user.user_metadata["display_name"] ||
    user.user_metadata["name"] ||
    "",
  email: user.email || undefined,
  isEmailVerified: user.email_confirmed_at != undefined,
});

/**
 * トークンを検証し、ユーザー情報を取得する関数
 */
export const validateToken = async (
  supabase: SupabaseClient,
  accessToken: string
): Promise<AuthUser | null> => {
  // Bearerトークンを使用してユーザー情報を取得
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error) {
    throw SupabaseErrorToAuthError(error);
  }

  return data.user ? SupabaseUserToAuthUser(data.user) : null;
};

/**
 * Supabaseからユーザー情報を取得する関数
 */
export const getSupabaseUser = async (
  supabase: SupabaseClient,
  userId: string
): Promise<AuthUser | null> => {
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error) throw SupabaseErrorToAuthError(error);
  if (!data.user) return null;
  return SupabaseUserToAuthUser(data.user);
};

/**
 * Supabaseからユーザーを削除する関数
 * 管理者権限が必要なため、Service Role Keyを使用したクライアントで実行する必要があります
 */
export const deleteSupabaseUser = async (
  supabase: SupabaseClient,
  userId: string
): Promise<void> => {
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) {
    throw SupabaseErrorToAuthError(error);
  }
};
