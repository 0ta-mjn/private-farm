import { Database } from "@repo/db/client";
import {
  discordInstallationsTable,
  discordChannelsTable,
} from "@repo/db/schema";
import { and, eq } from "@repo/db";
import { decrypt, encrypt } from "./utils";
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
  console.log("Discord token response:", t);

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

  // 3) Installation upsert
  const guildId = t.guild?.id ?? params.guildId;
  const guildName = t.guild?.name ?? "";
  const botUserId = t.bot?.id;

  // トークンの有効期限を計算（現在時刻 + expires_in秒）
  const expiresAt = new Date(Date.now() + t.expires_in * 1000);

  // DiscordInstallation のupsert処理
  const installationResult = await db
    .insert(discordInstallationsTable)
    .values({
      id: randomUUID(),
      organizationId: params.organizationId,
      guildId,
      guildName,
      botUserId,
      accessTokenEnc: encrypt(t.access_token),
      refreshTokenEnc: encrypt(t.refresh_token),
      expiresAt,
    })
    .onConflictDoUpdate({
      target: [
        discordInstallationsTable.organizationId,
        discordInstallationsTable.guildId,
      ],
      set: {
        guildName,
        botUserId,
        accessTokenEnc: encrypt(t.access_token),
        refreshTokenEnc: encrypt(t.refresh_token),
        expiresAt,
        updatedAt: new Date(),
      },
    })
    .returning();

  const installation = installationResult[0];
  if (!installation) {
    throw new Error("Failed to create or update Discord installation");
  }

  // 4) Channel upsert
  if (t.webhook) {
    await db
      .insert(discordChannelsTable)
      .values({
        id: randomUUID(),
        installationId: installation.id,
        channelId: t.webhook.channel_id,
        channelName: channelName,
        webhookId: t.webhook.id,
        webhookTokenEnc: encrypt(t.webhook.token),
      })
      .onConflictDoUpdate({
        target: [
          discordChannelsTable.installationId,
          discordChannelsTable.channelId,
        ],
        set: {
          channelName: channelName,
          webhookId: t.webhook.id,
          webhookTokenEnc: encrypt(t.webhook.token),
          updatedAt: new Date(),
        },
      });
  }

  return {
    installationId: installation.id,
    guildId: installation.guildId,
    botUserId: installation.botUserId,
    channelId: t.webhook?.channel_id || null,
    webhookId: t.webhook?.id || null,
    webhookToken: t.webhook ?? null,
  };
}

const MAX_RETRY_COUNT = 5;

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

export async function ensureAccessToken(
  db: Database,
  installationId: string,
  retryCount = 0
): Promise<string | null> {
  const installation = await db
    .select({
      access_token_enc: discordInstallationsTable.accessTokenEnc,
      refresh_token_enc: discordInstallationsTable.refreshTokenEnc,
      expires_at: discordInstallationsTable.expiresAt,
    })
    .from(discordInstallationsTable)
    .where(eq(discordInstallationsTable.id, installationId))
    .limit(1)
    .then((v) => v[0]);
  if (!installation) throw new Error("Installation not found");

  // 残り60秒未満ならリフレッシュ
  if (new Date(installation.expires_at).getTime() - Date.now() > 60_000)
    return decrypt(installation.access_token_enc);

  // single-flight lock
  const lockedRow = await db.transaction(async (tx) => {
    // :contentReference[oaicite:2]{index=2}
    const updated = await tx
      .update(discordInstallationsTable)
      .set({ refreshInProgress: true })
      .where(
        and(
          eq(discordInstallationsTable.id, installationId),
          eq(discordInstallationsTable.refreshInProgress, false)
        )
      )
      .returning(); // :contentReference[oaicite:3]{index=3}
    return updated[0]; // 空なら誰かが更新中
  });

  if (!lockedRow) {
    // 他プロセスが refresh 中。exponential backoffで再試行
    await new Promise((r) => setTimeout(r, Math.pow(2, retryCount) * 1000));
    if (retryCount >= MAX_RETRY_COUNT) {
      throw new Error("Failed to refresh access token after multiple attempts");
    }
    return ensureAccessToken(db, installationId, retryCount + 1);
  }

  try {
    const ref = await fetch(DISCORD_TOKEN_URL, {
      method: "POST",
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: decrypt(installation.refresh_token_enc),
      }),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }).then((r) => r.json());

    await db
      .update(discordInstallationsTable)
      .set({
        accessTokenEnc: encrypt(ref.access_token),
        refreshTokenEnc: encrypt(ref.refresh_token),
        refreshInProgress: false,
        expiresAt: new Date(Date.now() + ref.expires_in * 1000),
        updatedAt: new Date(),
      })
      .where(eq(discordInstallationsTable.id, installationId));

    return ref.access_token;
  } catch (e) {
    await db
      .update(discordInstallationsTable)
      .set({
        refreshInProgress: false,
        updatedAt: new Date(),
      })
      .where(eq(discordInstallationsTable.id, installationId));
    throw e;
  }
}
