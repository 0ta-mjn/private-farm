import { spawn } from "node:child_process";
import http from "node:http";

function waitForServer(url: string, timeout = 8_000) {
  return new Promise<void>((res, rej) => {
    const t0 = Date.now();
    const probe = () => {
      http
        .get(url, () => res())
        .on("error", () => {
          if (Date.now() - t0 > timeout)
            return rej(new Error("server timeout"));
          setTimeout(probe, 300);
        });
    };
    probe();
  });
}

const wrangler = spawn(
  "pnpm",
  [
    "wrangler",
    "dev",
    "src/daily/index.ts",
    "--port",
    "8081",
    "--config",
    "../../infra/cloudflare/reviewer/wrangler.toml",
    "--env",
    "daily",
    "--test-scheduled",
  ],
  { stdio: ["ignore", "inherit", "inherit"], shell: true, detached: true }
);

try {
  await waitForServer("http://localhost:8081", 1000);
  await new Promise<void>((res, rej) => {
    http
      .get("http://localhost:8081/__scheduled?cron=0+20+*+*+*", (r) =>
        r.statusCode != undefined && r.statusCode >= 200 && r.statusCode < 300
          ? res()
          : rej(new Error(`Unexpected status code: ${r.statusCode}`))
      )
      .on("error", rej);
  });
  console.log("✅ scheduled() executed once");
  process.kill(-wrangler.pid!, "SIGINT");
  process.exit(0);
} catch (e) {
  console.error(e);
  process.kill(-wrangler.pid!, "SIGINT");
  process.exit(1);
}
