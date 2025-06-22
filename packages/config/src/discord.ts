export const DiscordOAuthConfig = {
  scope: "bot webhook.incoming applications.commands",
  permissions: "309774642176", // DiscordのBotに必要な権限
};

export const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks";
export const DISCORD_OAUTH_URL = "https://discord.com/api/oauth2/authorize";
export const DISCORD_TOKEN_URL = "https://discord.com/api/oauth2/token";
export const DISCORD_API_URL = "https://discord.com/api/v10";

export const DISCORD_BOT_WELCOME_MESSAGE = `🎉 Discord 連携が完了しました！\n\nこちらのチャネルに重要な通知が送信されます。`;
