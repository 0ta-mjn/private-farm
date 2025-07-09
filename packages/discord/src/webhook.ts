import { DISCORD_WEBHOOK_URL } from "@repo/config";
import { WebhookPayload } from "./types";
import { createDiscordAPIErrorFromCode, DiscordAPIError } from "./errors";

interface Options {
  threadId?: string;
  wait?: boolean; // default true
  maxRetries?: number; // default 3
  files?: { name: string; data: Buffer | Blob; mime?: string }[];
}

export async function sendViaWebhook(
  channel: { webhookId: string; webhookToken: string },
  payload: WebhookPayload,
  opts: Options = {}
) {
  const wait = opts.wait ?? true;
  const qp = new URLSearchParams({
    ...(wait && { wait: "true" }),
    ...(opts.threadId && { thread_id: opts.threadId }),
  });

  const url = `${DISCORD_WEBHOOK_URL}/${channel.webhookId}/${channel.webhookToken}?${qp.toString()}`;

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
    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body,
      });

      if (res.status === 429) {
        /* ▶ 429: レートリミット */
        const retryAfterSec = Number(res.headers.get("Retry-After")) || 1;

        if (attempt === retries) {
          throw new DiscordAPIError(
            "rate_limit_exceeded",
            res.status,
            `Rate limit exceeded. Retry after ${retryAfterSec} seconds`
          );
        }

        await new Promise((r) => setTimeout(r, retryAfterSec * 1_000 + 50));
        continue;
      }

      if (!res.ok) {
        const errorText = await res.text();
        let errorData: { code?: string | number; message?: string } = {};

        try {
          errorData = JSON.parse(errorText);
        } catch {
          // JSONパースに失敗した場合はテキストをメッセージとして使用
          errorData = { message: errorText };
        }

        throw createDiscordAPIErrorFromCode(
          res.status,
          errorData.code,
          errorData.message || "Unknown Discord API error"
        );
      }

      return wait ? await res.json() : undefined; // 204 No-Content なら undefined
    } catch (error) {
      if (error instanceof DiscordAPIError) {
        throw error; // カスタムエラーはそのまま再スロー
      }

      // ネットワークエラーなどの場合
      if (attempt === retries) {
        throw new DiscordAPIError(
          "network_error",
          undefined,
          `Network error after ${retries + 1} attempts: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }

      // リトライ
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
}
