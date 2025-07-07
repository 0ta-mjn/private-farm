export type AuthErrorCode =
  | "user_not_found"
  | "token_expired"
  | "invalid_token"
  | "invalid_request"
  | "unauthorized"
  | "user_already_exists"
  | "email_not_verified"
  | "weak_password"
  | "password_mismatch"
  | "invalid_credentials"
  | "account_locked"
  | "account_disabled"
  | "unsupported_provider"
  | "rate_limit_exceeded"
  | "unknown_error"; // Allow custom error codes as well

export class AuthError extends Error {
  code: AuthErrorCode;
  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "AuthError";
  }
}
