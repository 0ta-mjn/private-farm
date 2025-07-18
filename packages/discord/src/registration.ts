import {
  DISCORD_API_URL,
  DISCORD_OAUTH_URL,
  DISCORD_TOKEN_URL,
  DiscordOAuthConfig,
} from "@repo/config";
import { createDiscordAPIErrorFromCode } from "./errors";
import { createRandomHex } from "./utils";
import { z } from "zod";

type TokenResp = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  webhook?: {
    id: string;
    token: string;
    guild_id: string;
    channel_id: string;
    name: string | null;
    avatar: string | null;
  };
  guild?: { id: string; name: string };
  bot?: { id: string };
};

export type DiscordRegistrationKeys = {
  discordClientId: string;
  discordClientSecret: string;
  discordBotToken: string;
};

export const DiscordRegistrationInput = z.object({
  code: z.string().min(1, "authorization code is required"),
  guildId: z.string().min(1, "guild ID is required"),
  redirectUri: z.string().url("a valid redirect URI is required"),
});
export type DiscordRegistrationInput = z.infer<typeof DiscordRegistrationInput>;

export async function registerDiscordChannel(
  keys: DiscordRegistrationKeys,
  params: DiscordRegistrationInput
) {
  // 1) code → access_token
  const tokRes = await fetch(DISCORD_TOKEN_URL, {
    method: "POST",
    body: new URLSearchParams({
      client_id: keys.discordClientId,
      client_secret: keys.discordClientSecret,
      grant_type: "authorization_code",
      code: params.code,
      redirect_uri: params.redirectUri,
    }),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  if (!tokRes.ok) {
    const res: { code?: string; message?: string } = await tokRes.json();
    throw createDiscordAPIErrorFromCode(
      tokRes.status,
      res.code,
      res.message ||
        `Failed to get access token with status: ${tokRes.statusText}`
    );
  }

  const t: TokenResp = await tokRes.json();

  // 2) チャンネル名を取得
  let channelName = "";
  if (t.webhook?.channel_id) {
    try {
      const channelRes = await fetch(
        `${DISCORD_API_URL}/guilds/${t.webhook.guild_id}/channels`,
        {
          headers: {
            Authorization: `Bot ${keys.discordBotToken}`,
          },
        }
      );

      if (channelRes.ok) {
        const channelData = await channelRes.json();
        const channel = Array.isArray(channelData)
          ? channelData.find((c) => c.id === t.webhook?.channel_id)
          : undefined;
        if (channel) channelName = channel.name || "";
      } else {
        const errorData = await channelRes.json();
        console.error("Failed to fetch channel name:", errorData);
        // チャンネル名取得失敗は処理を継続
      }
    } catch (error) {
      console.error("Error fetching channel name:", error);
      // チャンネル名取得失敗は処理を継続
    }
  }

  // 3) Channel upsert
  const guildId = t.guild?.id ?? params.guildId;
  const guildName = t.guild?.name ?? "";

  return {
    guildId,
    guildName,
    channelId: t.webhook?.channel_id || null,
    channelName,
    webhookId: t.webhook?.id || null,
    webhookToken: t.webhook?.token || null,
  };
}

export const DiscordOauthRedirectUrlParams = z.object({
  redirectUri: z.string().url("valid redirect URI is required"),
});
export type DiscordOauthRedirectUrlParams = z.infer<
  typeof DiscordOauthRedirectUrlParams
>;

export function getDiscordOauthRedirectUrl(
  keys: DiscordRegistrationKeys,
  organizationId: string,
  { redirectUri }: DiscordOauthRedirectUrlParams
) {
  const clientId = keys.discordClientId;
  // CSRF対策のためのstateパラメータを生成
  // organizationIdとランダムな値を組み合わせて一意のstateを作成
  const nonce = createRandomHex(16); // 16バイトのランダムな値
  const state = `${organizationId}:${nonce}`;

  const oauthUrl = new URL(DISCORD_OAUTH_URL);
  oauthUrl.searchParams.set("client_id", clientId);
  oauthUrl.searchParams.set("state", state);
  oauthUrl.searchParams.set("redirect_uri", redirectUri);
  oauthUrl.searchParams.set("response_type", "code");
  // oauthUrl.searchParams.set("integration_type", "0"); // guild install
  oauthUrl.searchParams.set("scope", DiscordOAuthConfig.scope);
  oauthUrl.searchParams.set("permissions", DiscordOAuthConfig.permissions);

  const response = oauthUrl.toString();

  return { url: response, state };
}
