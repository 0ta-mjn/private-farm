/**
 * ChatGPT-generated — July 2025
 *
 * Discord API で頻出するエラーコードを用途別に薄くまとめたもの。
 * 足りないものは随時 enum に追記し、switch にマップするだけで拡張できます。
 */

/* ① まずはアプリ側で意味が欲しいコードだけ列挙 */
export type DiscordAPIErrorCode =
  // 共通
  | "rate_limit_exceeded"
  | "unauthorized"
  | "invalid_request"
  | "invalid_client"
  | "invalid_grant"
  | "invalid_scope"
  | "unsupported_grant_type"
  | "invalid_form_body"
  // guild チャンネル作成
  | "unknown_guild"
  | "missing_access"
  | "missing_permissions"
  | "max_channels_reached"
  // webhook
  | "unknown_webhook"
  | "invalid_webhook_token"
  // フォールバック
  | "network_error"
  | "unknown_error";

/* ② 共通 Error クラス */
export class DiscordAPIError extends Error {
  constructor(
    public code: DiscordAPIErrorCode,
    /** Discord が返した生の code（数値 or 文字列） */
    public rawCode?: string | number,
    message?: string
  ) {
    super(message);
    this.name = "DiscordAPIError";
  }
}

/* ③ code / statusCode から自前エラーへマッピング */
export function createDiscordAPIErrorFromCode(
  statusCode: number,
  code?: string | number,
  message?: string
): DiscordAPIError {
  // ── 429 はどのエンドポイントでも共通 ───────────
  if (statusCode === 429) {
    return new DiscordAPIError(
      "rate_limit_exceeded",
      code,
      message ?? "Rate limit exceeded"
    );
  }

  /* ── 文字列コード（OAuth2 エラー）─────────────── */
  if (typeof code === "string") {
    switch (code) {
      case "invalid_request":
        return new DiscordAPIError("invalid_request", code, message);
      case "invalid_client":
        return new DiscordAPIError("invalid_client", code, message);
      case "invalid_grant":
        return new DiscordAPIError("invalid_grant", code, message);
      case "invalid_scope":
        return new DiscordAPIError("invalid_scope", code, message);
      case "unsupported_grant_type":
        return new DiscordAPIError(
          "unsupported_grant_type",
          code,
          message
        );
      default:
        break; // fallthrough to numeric / unknown
    }
  }

  /* ── 数値コード（Discord 独自エラー）──────────── */
  switch (code) {
    /* /api/v10/guilds/:guild_id/channels */
    case 10004: // Unknown Guild :contentReference[oaicite:0]{index=0}
      return new DiscordAPIError("unknown_guild", code, message);
    case 50001: // Missing Access :contentReference[oaicite:1]{index=1}
      return new DiscordAPIError("missing_access", code, message);
    case 50013: // Missing Permissions :contentReference[oaicite:2]{index=2}
      return new DiscordAPIError("missing_permissions", code, message);
    case 30013: // Max Channels Reached :contentReference[oaicite:3]{index=3}
      return new DiscordAPIError("max_channels_reached", code, message);
    case 50035: // Invalid Form Body :contentReference[oaicite:4]{index=4}
      return new DiscordAPIError("invalid_form_body", code, message);

    /* /api/webhooks/:id/:token */
    case 10015: // Unknown Webhook :contentReference[oaicite:5]{index=5}
      return new DiscordAPIError("unknown_webhook", code, message);
    case 50027: // Invalid Webhook Token :contentReference[oaicite:6]{index=6}
      return new DiscordAPIError("invalid_webhook_token", code, message);

    /* OAuth2 token エンドポイントは数値 code を持たないのでここには追加なし */

    /* 認可エラー（共通） */
    case 40001: // Unauthorized :contentReference[oaicite:7]{index=7}
      return new DiscordAPIError("unauthorized", code, message);
  }

  /* ── ここまで来たら未知 ─────────────────────── */
  return new DiscordAPIError("unknown_error", code, message);
}
