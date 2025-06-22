import { Database } from "@repo/db/client";
import { discordChannelsTable } from "@repo/db/schema";
import { encrypt } from "./utils";
import { randomBytes, randomUUID } from "crypto";
import {
  DISCORD_API_URL,
  DISCORD_OAUTH_URL,
  DISCORD_TOKEN_URL,
  DiscordOAuthConfig,
} from "@repo/config";

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

export async function registerDiscordChannel(
  db: Database,
  params: {
    organizationId: string;
    code: string;
    guildId: string;
    redirectUri: string;
  }
) {
  // 1) code → access_token
  const tokRes = await fetch(DISCORD_TOKEN_URL, {
    method: "POST",
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID!,
      client_secret: process.env.DISCORD_CLIENT_SECRET!,
      grant_type: "authorization_code",
      code: params.code,
      redirect_uri: params.redirectUri,
    }),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  if (!tokRes.ok) {
    const res = await tokRes.json();
    switch (res.code) {
      case 50001:
        throw new Error("Bot is not in the guild");
      case 40001:
        throw new Error("Invalid or expired code");
      case 401:
        throw new Error("Unauthorized: Invalid client credentials");
      default:
        throw new Error(`Discord API error: ${res.message}`);
    }
  }
  const t: TokenResp = await tokRes.json();

  // 2) チャンネル名を取得
  let channelName = "";
  if (t.webhook?.channel_id) {
    const channelRes = await fetch(
      `${DISCORD_API_URL}/guilds/${t.webhook.guild_id}/channels`,
      {
        headers: {
          Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        },
      }
    );
    if (channelRes.ok) {
      const channelData = await channelRes.json();
      console.log("Fetched channel data:", channelData);
      const channel = Array.isArray(channelData)
        ? channelData.find((c) => c.id === t.webhook?.channel_id)
        : undefined;
      if (channel) channelName = channel.name || "";
    } else {
      const errorText = await channelRes.text();
      console.error("Failed to fetch channel name:", errorText);
    }
  }

  // 3) Channel upsert
  const guildId = t.guild?.id ?? params.guildId;
  const guildName = t.guild?.name ?? "";

  if (t.webhook) {
    const channelResult = await db
      .insert(discordChannelsTable)
      .values({
        id: randomUUID(),
        organizationId: params.organizationId,
        guildId,
        guildName,
        channelId: t.webhook.channel_id,
        name: channelName,
        webhookId: t.webhook.id,
        webhookTokenEnc: encrypt(t.webhook.token),
        notificationSettings: {
          daily: true,
          weekly: true,
          monthly: true,
        },
      })
      .onConflictDoUpdate({
        target: [
          discordChannelsTable.organizationId,
          discordChannelsTable.channelId,
        ],
        set: {
          guildId,
          guildName,
          name: channelName,
          webhookId: t.webhook.id,
          webhookTokenEnc: encrypt(t.webhook.token),
          updatedAt: new Date(),
        },
      })
      .returning();

    const channel = channelResult[0];
    if (!channel) {
      throw new Error("Failed to create or update Discord channel");
    }

    return {
      channelId: channel.channelId,
      guildId: channel.guildId,
      webhookId: channel.webhookId,
      webhookToken: t.webhook,
    };
  }

  throw new Error("No webhook information received from Discord");
}

export function getDiscordOauthRedirectUrl(
  organizationId: string,
  redirectUri: string
) {
  const clientId = process.env.DISCORD_CLIENT_ID!;
  // CSRF対策のためのstateパラメータを生成
  // organizationIdとランダムな値を組み合わせて一意のstateを作成
  const nonce = randomBytes(16).toString("hex");
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
  console.log("Discord OAuth redirect URL:", response);

  return { url: response, state };
}
