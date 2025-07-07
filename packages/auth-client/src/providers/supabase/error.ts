import { AuthError as SupabaseError } from "@supabase/supabase-js";
import { AuthError, AuthErrorCode } from "../../errors";

export const SupabaseErrorToAuthError = (error: SupabaseError): AuthError => {
  let code: AuthErrorCode = "unknown_error";
  switch (error.code) {
    case "user_not_found":
    case "token_expired":
    case "invalid_token":
    case "invalid_request":
    case "unauthorized":
    case "email_not_verified":
    case "password_too_weak":
    case "password_mismatch":
    case "invalid_credentials":
    case "weak_password":
    case "user_already_exists":
      code = error.code as AuthErrorCode;
      break;
    case "email_exists":
      code = "user_already_exists";
      break;
    case "bad_jwt":
    case "bad_oauth_state":
      code = "invalid_token";
      break;
    case "user_banned":
      code = "account_locked";
      break;
    case "over_request_rate_limit":
      code = "rate_limit_exceeded";
      break;
    case "same_password":
      code = "password_mismatch";
      break;
  }
  return new AuthError(
    code,
    `Supabase error: ${error.message} (code: ${error.code})`
  );
};
