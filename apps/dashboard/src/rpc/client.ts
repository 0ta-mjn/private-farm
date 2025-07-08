/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/lib/auth-provider";
import type { AppType } from "@repo/api";
import { ClientResponse, hc } from "hono/client";

if (!process.env.NEXT_PUBLIC_API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is not defined");
}

const rawClient = hc<AppType>(process.env.NEXT_PUBLIC_API_URL, {
  headers: async () => {
    // Supabaseセッションからトークンを取得
    const session = await auth.getSession();
    return {
      authorization: session?.accessToken
        ? `Bearer ${session.accessToken}`
        : "",
    };
  },
});

export class ClientError extends Error {
  status: number;
  body?: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ClientError";
    this.status = status;
    this.body = body;
  }
}

/**
 * Error handling function for client responses
 * @param res - The promise of the client response
 * @returns A promise that resolves to the JSON data if the response is OK, or throws a ClientError if not
 * @throws {ClientError} If the response is not OK,
 */
export const handleError = async <T>(
  p: Promise<ClientResponse<T | null>>
): Promise<T> => {
  try {
    const res = await p; // fetch が成功
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new ClientError(res.status, res.statusText || txt, txt);
    }
    const r = (await res.json()) as T;
    return r;
  } catch (e) {
    if (e instanceof ClientError) {
      throw e;
    }
    throw new ClientError(500, (e as Error).message);
  }
};

// メソッドを判定して返り値を書き換え
type JsonifiedMethod<F> = F extends (
  ...a: infer P
) => Promise<ClientResponse<infer R>>
  ? (...a: P) => Promise<R>
  : never;

// 深いネストを辿る
export type JsonClient<T> = {
  [K in keyof T]: T[K] extends (...a: any) => any
    ? JsonifiedMethod<T[K]>
    : T[K] extends object
      ? JsonClient<T[K]>
      : T[K];
};

const wrapFn = <F extends (...a: any) => Promise<ClientResponse<any>>>(fn: F) =>
  ((...args: Parameters<F>) => handleError(fn(...args))) as JsonifiedMethod<F>;

const METHOD_RE = /^\$(get|post|put|patch|delete)$/;

export const withClientError = <T extends object>(obj: T): JsonClient<T> =>
  new Proxy(obj, {
    get(target, prop, receiver) {
      const v = Reflect.get(target, prop, receiver);

      // ① ネストは object/function の両方を再帰的に包む
      if (
        v !== null &&
        (typeof v === "object" || typeof v === "function") &&
        !METHOD_RE.test(String(prop)) // ← $get などは除外
      ) {
        return withClientError(v);
      }

      // $get/$post/$put/$patch/$delete にマッチしたら包む
      if (typeof v === "function" && METHOD_RE.test(String(prop))) {
        return wrapFn(v as any);
      }

      return v; // $url 等はそのまま
    },
  }) as JsonClient<T>;

export const client = withClientError(rawClient);
