import { SupabaseClient } from "@supabase/supabase-js";
import {
  AuthSession,
  SignInEmailInput,
  SignUpEmailInput,
  UpdateEmailInput,
  ResetPasswordForEmailInput,
  UpdatePasswordInput,
  AuthUser,
} from "../../interface";
import { SupabaseUserToAuthUser } from "./user";
import { SupabaseErrorToAuthError } from "./error";

/**
 * Supabaseのメールアドレスとパスワードを使用してサインインする関数
 */
export async function signInWithEmail(
  supabase: SupabaseClient,
  input: SignInEmailInput
): Promise<AuthSession | null> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error) {
    throw SupabaseErrorToAuthError(error);
  }

  if (!data.user || !data.session) {
    return null;
  }

  return {
    user: SupabaseUserToAuthUser(data.user),
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at,
  };
}

/**
 * Supabaseのメールアドレスとパスワードを使用してサインアップする関数
 */
export async function signUpWithEmail(
  supabase: SupabaseClient,
  input: SignUpEmailInput
): Promise<AuthUser | null> {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: input.redirectUrl,
    },
  });

  if (error) {
    throw SupabaseErrorToAuthError(error);
  }

  if (!data.user) {
    return null;
  }

  return SupabaseUserToAuthUser(data.user);
}

/**
 * Supabaseのメールアドレスを更新する関数
 */
export async function updateEmail(
  supabase: SupabaseClient,
  input: UpdateEmailInput
): Promise<{
  isSentVerificationEmail: boolean;
}> {
  const { data, error } = await supabase.auth.updateUser(
    {
      email: input.newEmail,
    },
    { emailRedirectTo: input.redirectUrl }
  );

  if (error) {
    throw SupabaseErrorToAuthError(error);
  }

  return {
    isSentVerificationEmail:
      data.user.email_change_sent_at !== null &&
      data.user.new_email === input.newEmail,
  };
}

/**
 * Supabaseでパスワードリセットメールを送信する関数
 */
export async function resetPasswordForEmail(
  supabase: SupabaseClient,
  input: ResetPasswordForEmailInput
): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(input.email, {
    redirectTo: input.redirectTo,
  });

  if (error) {
    throw SupabaseErrorToAuthError(error);
  }
}

/**
 * Supabaseでパスワードを更新する関数
 */
export async function updatePassword(
  supabase: SupabaseClient,
  input: UpdatePasswordInput
): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    password: input.password,
  });

  if (error) {
    throw SupabaseErrorToAuthError(error);
  }
}
