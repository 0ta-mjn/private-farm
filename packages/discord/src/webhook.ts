import { Database } from "@repo/db/client";
import { discordChannelsTable } from "@repo/db/schema";
import { eq } from "@repo/db";
import { decrypt } from "./utils";

const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks";

interface Options {
  threadId?: string;
  wait?: boolean; // default true
  maxRetries?: number; // default 3
  files?: { name: string; data: Buffer | Blob; mime?: string }[];
}

/** Execute-Webhook body (抜粋) */
export interface WebhookPayload {
  content?: string; // ≤ 2000 chars
  username?: string;
  avatar_url?: string;
  embeds?: unknown[]; // Embed Object[]
  allowed_mentions?: unknown;
  components?: unknown[]; // Buttons など
}

export async function sendViaWebhook(
  db: Database,
  channelUuid: string,
  payload: unknown,
  opts: Options = {}
) {
  const channel = await db
    .select({
      webhookId: discordChannelsTable.webhookId,
      webhookTokenEnc: discordChannelsTable.webhookTokenEnc,
    })
    .from(discordChannelsTable)
    .where(eq(discordChannelsTable.id, channelUuid))
    .limit(1)
    .then((rows) => rows[0]);
  if (!channel?.webhookTokenEnc) throw new Error("Channel not found");

  const wait = opts.wait ?? true;
  const qp = new URLSearchParams({
    ...(wait && { wait: "true" }),
    ...(opts.threadId && { thread_id: opts.threadId }),
  });

  const url = `${DISCORD_WEBHOOK_URL}/${channel.webhookId}/${decrypt(channel.webhookTokenEnc)}?${qp.toString()}`;

  const form = opts.files?.length
    ? (() => {
        const f = new FormData();
        f.append("payload_json", JSON.stringify(payload));
        opts.files!.forEach((file, i) =>
          f.append(
            `files[${i}]`,
            // Blob でなければ新たに Blob を生成
            file.data instanceof Blob
              ? file.data
              : new Blob([file.data], {
                  type: file.mime ?? "application/octet-stream",
                }),
            file.name
          )
        );
        return f;
      })()
    : null;

  const body = form ?? JSON.stringify(payload);
  const headers = form ? undefined : { "Content-Type": "application/json" };
  const retries = opts.maxRetries ?? 3;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body,
    });

    if (res.status !== 429) {
      if (!res.ok)
        throw new Error(`Discord ${res.status}: ${await res.text()}`);
      return wait ? await res.json() : undefined; // 204 No-Content なら undefined
    }

    /* ▶ 429: レートリミット */
    const retryAfterSec = Number(res.headers.get("Retry-After")) || 1;
    await new Promise((r) => setTimeout(r, retryAfterSec * 1_000 + 50));
  }
  throw new Error("Discord rate-limit retry exceeded");
}
