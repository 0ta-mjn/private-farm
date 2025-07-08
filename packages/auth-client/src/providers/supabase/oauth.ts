import { SupabaseClient } from "@supabase/supabase-js";
import { OAuthSigninUrlInput, SupportedOAuthProvider } from "../../interface";
import { SupabaseErrorToAuthError } from "./error";
import { AuthError } from "../../errors";

/**
 * SupabaseのOAuthリダイレクトURLを取得する関数
 */
export const redirectOAuthSigninUrl = async (
  supabase: SupabaseClient,
  provider: SupportedOAuthProvider,
  { redirectUrl, scope }: OAuthSigninUrlInput
): Promise<void> => {
  const {  error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: redirectUrl, scopes: scope },
  });

  if (error) {
    throw SupabaseErrorToAuthError(error);
  }
};

/**
 * SupabaseからOAuthプロバイダーを解除する関数
 */
export const linkOAuthProvider = async (
  supabase: SupabaseClient,
  provider: SupportedOAuthProvider,
  { redirectUrl, scope }: OAuthSigninUrlInput
): Promise<void> => {
  const { error } = await supabase.auth.linkIdentity({
    provider,
    options: {
      redirectTo: redirectUrl,
      scopes: scope,
    },
  });

  if (error) {
    throw SupabaseErrorToAuthError(error);
  }
};

/**
 * SupabaseからOAuthプロバイダーのリンクを解除する関数
 */
export const unlinkOAuthProvider = async (
  supabase: SupabaseClient,
  provider: SupportedOAuthProvider
): Promise<void> => {
  const { data: userResponse, error } = await supabase.auth.getUserIdentities();

  if (error) {
    throw SupabaseErrorToAuthError(error);
  }

  const identity = userResponse?.identities?.find(
    (identity) => identity.provider === provider
  );
  if (!identity) {
    throw new AuthError("user_not_found", "ユーザーが見つかりません");
  }

  const { error: unlinkError } = await supabase.auth.unlinkIdentity(identity);
  if (unlinkError) {
    throw SupabaseErrorToAuthError(unlinkError);
  }
};
