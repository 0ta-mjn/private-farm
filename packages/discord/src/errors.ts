/**
 * Discord関連のカスタムエラークラス
 */

export class DiscordError extends Error {
  constructor(
    message: string,
    public code?: string | number
  ) {
    super(message);
    this.name = "DiscordError";
  }
}

export class DiscordAuthError extends DiscordError {
  constructor(message: string, code?: string | number) {
    super(message, code);
    this.name = "DiscordAuthError";
  }
}

export class DiscordBotError extends DiscordError {
  constructor(message: string, code?: string | number) {
    super(message, code);
    this.name = "DiscordBotError";
  }
}

export class DiscordAPIError extends DiscordError {
  constructor(
    message: string,
    public statusCode?: number,
    code?: string | number
  ) {
    super(message, code);
    this.name = "DiscordAPIError";
  }
}

export class DiscordConfigError extends DiscordError {
  constructor(message: string) {
    super(message);
    this.name = "DiscordConfigError";
  }
}

export class DiscordWebhookError extends DiscordError {
  constructor(
    message: string,
    public statusCode?: number,
    code?: string | number
  ) {
    super(message, code);
    this.name = "DiscordWebhookError";
  }
}

export class DiscordRateLimitError extends DiscordError {
  constructor(
    message: string,
    public retryAfter?: number
  ) {
    super(message);
    this.name = "DiscordRateLimitError";
  }
}

export class DiscordChannelNotFoundError extends DiscordError {
  constructor(channelId?: string) {
    super(channelId ? `Channel not found: ${channelId}` : "Channel not found");
    this.name = "DiscordChannelNotFoundError";
  }
}

/**
 * Discord APIエラーコードに基づいて適切なエラーを生成
 */
export function createDiscordErrorFromCode(
  code: string | number,
  message?: string
): DiscordError {
  switch (code) {
    case 50001:
      return new DiscordBotError("Bot is not in the guild", code);
    case 40001:
      return new DiscordAuthError("Invalid or expired code", code);
    case 401:
      return new DiscordAuthError(
        "Unauthorized: Invalid client credentials",
        code
      );
    case 10003:
      return new DiscordAPIError("Unknown channel", undefined, code);
    case 50013:
      return new DiscordAPIError("Missing permissions", undefined, code);
    default:
      return new DiscordAPIError(
        message || "Unknown Discord API error",
        undefined,
        code
      );
  }
}

/**
 * Discord APIレスポンスからエラーを生成
 */
export function createDiscordErrorFromResponse(
  response: { code?: string | number; message?: string },
  statusCode?: number
): DiscordError {
  if (response.code) {
    return createDiscordErrorFromCode(response.code, response.message);
  }

  if (statusCode) {
    switch (statusCode) {
      case 401:
        return new DiscordAuthError("Unauthorized");
      case 403:
        return new DiscordAPIError("Forbidden", statusCode);
      case 404:
        return new DiscordAPIError("Not found", statusCode);
      case 429:
        return new DiscordAPIError("Rate limited", statusCode);
      default:
        return new DiscordAPIError(
          response.message || "Discord API error",
          statusCode
        );
    }
  }

  return new DiscordError(response.message || "Unknown Discord error");
}
