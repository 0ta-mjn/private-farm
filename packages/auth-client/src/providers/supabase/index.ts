import {
  createClient,
  SupabaseClient,
} from "@supabase/supabase-js";
import {
  AuthProvider,
  AuthSession,
  SignInInput,
  SignUpInput,
  UpdateEmailInput,
  ResetPasswordForEmailInput,
  UpdatePasswordInput,
  ResetPasswordInput,
  OAuthSigninUrlInput,
  VerifyCodeInput,
  SupportedOAuthProvider,
  AuthUser,
} from "../../interface";
import {
  validateToken,
  getSupabaseSession,
  getSessionFromCode,
  refreshToken,
  signOut,
  SupabaseSessionToAuthSession,
  getSupabaseUserIdentities,
} from "./user";
import {
  signInWithEmail,
  signUpWithEmail,
  updateEmail,
  resetPasswordForEmail,
  updatePassword,
} from "./email";
import { AuthError } from "../../errors";
import {
  redirectOAuthSigninUrl,
  linkOAuthProvider,
  unlinkOAuthProvider,
} from "./oauth";

export type SupabaseAuthProviderConfig = {
  provider: "supabase";
  config: {
    supabaseUrl: string;
    supabaseAnonKey: string;
  };
};

export class SupabaseAuthProvider implements AuthProvider {
  supabase: SupabaseClient;
  constructor({
    supabaseAnonKey,
    supabaseUrl,
  }: SupabaseAuthProviderConfig["config"]) {
    this.supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        flowType: "pkce",
        detectSessionInUrl: false,
      },
    });
  }

  signIn(input: SignInInput): Promise<AuthSession | null> {
    switch (input.provider) {
      case "email":
        return signInWithEmail(this.supabase, input.input);
      case "oauth":
        return getSessionFromCode(this.supabase, input.input.code);
      default:
        throw new Error(
          `Unsupported provider: ${(input as Record<string, unknown>).provider}`
        );
    }
  }

  signUp(input: SignUpInput): Promise<AuthUser | null> {
    switch (input.provider) {
      case "email":
        return signUpWithEmail(this.supabase, input.input);
      case "oauth":
        return getSessionFromCode(this.supabase, input.input.code).then(
          (session) => session?.user || null
        );
      default:
        throw new Error(
          `Unsupported provider: ${(input as Record<string, unknown>).provider}`
        );
    }
  }

  signOut() {
    return signOut(this.supabase);
  }

  verifyCode({ code }: VerifyCodeInput): Promise<AuthSession | null> {
    return getSessionFromCode(this.supabase, code);
  }

  validateToken(tokens: { accessToken: string; refreshToken?: string }) {
    if (!tokens.refreshToken) {
      throw new AuthError("invalid_token", "リフレッシュトークンが必要です");
    }
    return validateToken(this.supabase, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  }

  refreshToken(token: string): Promise<AuthSession | null> {
    return refreshToken(this.supabase, token);
  }

  getSession() {
    return getSupabaseSession(this.supabase);
  }

  getIdentities() {
    return getSupabaseUserIdentities(this.supabase);
  }

  updateEmail(input: UpdateEmailInput) {
    return updateEmail(this.supabase, input);
  }

  sendResetPassword(input: ResetPasswordForEmailInput) {
    return resetPasswordForEmail(this.supabase, input);
  }

  resetPassword({ password }: ResetPasswordInput) {
    return updatePassword(this.supabase, { password });
  }

  redirectOAuthSigninUrl(
    provider: SupportedOAuthProvider,
    input: OAuthSigninUrlInput
  ) {
    return redirectOAuthSigninUrl(this.supabase, provider, input);
  }

  linkOAuthProvider(
    provider: SupportedOAuthProvider,
    input: OAuthSigninUrlInput
  ) {
    return linkOAuthProvider(this.supabase, provider, input);
  }

  unlinkOAuthProvider(provider: SupportedOAuthProvider) {
    return unlinkOAuthProvider(this.supabase, provider);
  }

  updatePassword(input: UpdatePasswordInput) {
    return updatePassword(this.supabase, input);
  }

  onAuthStateChange(
    callback: (session: AuthSession | null, event?: string) => void
  ): () => void {
    return this.supabase.auth.onAuthStateChange((event, session) => {
      callback(session ? SupabaseSessionToAuthSession(session) : null, event);
    }).data.subscription.unsubscribe;
  }
}
