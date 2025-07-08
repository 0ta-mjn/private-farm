import { z } from "zod";

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  isEmailVerified: boolean;
}

export const SupportedOAuthProviderSchema = z.enum(["discord"]);
export type SupportedOAuthProvider = z.infer<
  typeof SupportedOAuthProviderSchema
>;

export const AuthProviderNameSchema = z.enum([
  "email",
  ...SupportedOAuthProviderSchema.options,
]);
export type AuthProviderName = z.infer<typeof AuthProviderNameSchema>;

export interface AuthUserIdentity {
  provider: AuthProviderName;
  providerUserId?: string;
  email?: string; // Only for email provider
  name?: string; // Only for email provider
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

export interface AuthProvider {
  refreshToken(token: string): Promise<AuthSession | null>;
  getSession(): Promise<AuthSession | null>;
  getIdentities(): Promise<AuthUserIdentity[]>;
  signIn(input: SignInInput): Promise<AuthSession | null>;
  signUp(input: SignUpInput): Promise<AuthUser | null>;
  signOut(): Promise<void>;
  verifyCode(input: VerifyCodeInput): Promise<AuthSession | null>;
  updateEmail(
    input: UpdateEmailInput
  ): Promise<{ isSentVerificationEmail: boolean }>;
  sendResetPassword(input: ResetPasswordForEmailInput): Promise<void>;
  resetPassword(input: ResetPasswordInput): Promise<void>;
  updatePassword(input: UpdatePasswordInput): Promise<void>;
  redirectOAuthSigninUrl(
    provider: SupportedOAuthProvider,
    input: OAuthSigninUrlInput
  ): Promise<void>;
  linkOAuthProvider(
    provider: SupportedOAuthProvider,
    input: OAuthSigninUrlInput
  ): Promise<void>;
  unlinkOAuthProvider(provider: SupportedOAuthProvider): Promise<void>;
  onAuthStateChange(
    callback: (session: AuthSession | null, event?: string) => void
  ): () => void;
}

export const SignInEmailInputSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});
export type SignInEmailInput = z.infer<typeof SignInEmailInputSchema>;

export const SignInOAuthInputSchema = z.object({
  code: z.string(), // For OAuth flows that require a code
});
export type SignInOAuthInput = z.infer<typeof SignInOAuthInputSchema>;

export const SignInInputSchema = z.discriminatedUnion("provider", [
  z.object({
    provider: z.literal("email"),
    input: SignInEmailInputSchema,
  }),
  z.object({
    provider: z.literal("oauth"),
    input: SignInOAuthInputSchema,
  }),
]);
export type SignInInput = z.infer<typeof SignInInputSchema>;

export const SignUpEmailInputSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  redirectUrl: z.string().optional(),
});
export type SignUpEmailInput = z.infer<typeof SignUpEmailInputSchema>;

export const SignUpInputSchema = z.discriminatedUnion("provider", [
  z.object({
    provider: z.literal("email"),
    input: SignUpEmailInputSchema,
  }),
  z.object({
    provider: z.literal("oauth"),
    input: SignInOAuthInputSchema, // Reusing OAuth input for sign-up
  }),
]);
export type SignUpInput = z.infer<typeof SignUpInputSchema>;

export const UpdateEmailInputSchema = z.object({
  newEmail: z.string().email(),
  redirectUrl: z.string().optional(),
});
export type UpdateEmailInput = z.infer<typeof UpdateEmailInputSchema>;

export const ResetPasswordForEmailInputSchema = z.object({
  email: z.string().email(),
  redirectTo: z.string(),
});
export type ResetPasswordForEmailInput = z.infer<
  typeof ResetPasswordForEmailInputSchema
>;

export const ResetPasswordInputSchema = z.object({
  password: z.string().min(8, "パスワードは8文字以上で入力してください"),
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordInputSchema>;

export const UpdatePasswordInputSchema = z.object({
  password: z.string().min(8, "パスワードは8文字以上で入力してください"),
});
export type UpdatePasswordInput = z.infer<typeof UpdatePasswordInputSchema>;

export const OAuthSigninUrlInputSchema = z.object({
  redirectUrl: z.string().optional(),
  scope: z.string().optional(),
});
export type OAuthSigninUrlInput = z.infer<typeof OAuthSigninUrlInputSchema>;

export const VerifyCodeInputSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("verify-email"),
    code: z.string().min(1, "トークンは必須です"),
    signIn: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("reset-password"),
    code: z.string().min(1, "トークンは必須です"),
  }),
  z.object({
    type: z.literal("update-email"),
    code: z.string().min(1, "トークンは必須です"),
  }),
]);
export type VerifyCodeInput = z.infer<typeof VerifyCodeInputSchema>;
