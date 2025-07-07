import { Session, SupabaseClient, User } from "@supabase/supabase-js";
import {
  AuthProviderName,
  AuthProviderNameSchema,
  AuthSession,
  AuthUser,
  AuthUserIdentity,
} from "../../interface";
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
 * SupabaseのUserオブジェクトをAuthUserに変換する関数
 * SupabaseのUserオブジェクトは、user_metadataに名前やフルネームを含むことがあるため、
 * それらを適切にマッピングしてAuthUser形式に変換します。
 */
export const SupabaseSessionToAuthSession = (
  session: Session
): AuthSession => ({
  user: SupabaseUserToAuthUser(session.user),
  accessToken: session.access_token,
  refreshToken: session.refresh_token,
  expiresAt: session.expires_at,
});

/**
 * トークンを検証し、ユーザー情報を取得する関数
 */
export const validateToken = async (
  supabase: SupabaseClient,
  tokens: {
    accessToken: string;
    refreshToken: string;
  }
): Promise<AuthSession | null> => {
  // Bearerトークンを使用してユーザー情報を取得
  const { data, error } = await supabase.auth.setSession({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });
  if (error) {
    throw SupabaseErrorToAuthError(error);
  }

  return data.session ? SupabaseSessionToAuthSession(data.session) : null;
};

/**
 * リフレッシュトークンを使用して新しいセッションを取得する関数
 */
export const refreshToken = async (
  supabase: SupabaseClient,
  refreshToken: string
): Promise<AuthSession | null> => {
  // リフレッシュトークンを使用して新しいセッションを取得
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });
  if (error) {
    throw SupabaseErrorToAuthError(error);
  }
  return data.session ? SupabaseSessionToAuthSession(data.session) : null;
};

/**
 * Supabaseからユーザー情報を取得する関数
 */
export const getSupabaseSession = async (
  supabase: SupabaseClient
): Promise<AuthSession | null> => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw SupabaseErrorToAuthError(error);
  if (!data.session) return null;
  return SupabaseSessionToAuthSession(data.session);
};

/**
 * SupabaseからユーザーのIDとプロバイダー情報を取得する関数
 */
export const getSupabaseUserIdentities = async (
  supabase: SupabaseClient
): Promise<AuthUserIdentity[]> => {
  const { data, error } = await supabase.auth.getUserIdentities();
  if (error) throw SupabaseErrorToAuthError(error);

  return (
    data.identities
      ?.filter(
        (v): v is typeof v & { provider: AuthProviderName } =>
          AuthProviderNameSchema.safeParse(v.provider).success
      )
      .map((identity) => ({
        provider: identity.provider,
        providerUserId: identity.user_id,
        name:
          identity.identity_data?.["full_name"] ||
          identity.identity_data?.["display_name"] ||
          identity.identity_data?.["name"] ||
          "",
        email: identity.identity_data?.email,
      })) || []
  );
};

/**
 * Supabaseの認証コードを使用してセッションを取得する関数
 */
export const getSessionFromCode = async (
  supabase: SupabaseClient,
  code: string
): Promise<AuthSession | null> => {
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    throw SupabaseErrorToAuthError(error);
  }

  return data.session ? SupabaseSessionToAuthSession(data.session) : null;
};

/**
 * Supabaseのユーザーのメールアドレスを更新する関数
 */
export const signOut = async (supabase: SupabaseClient): Promise<void> => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw SupabaseErrorToAuthError(error);
  }
};
