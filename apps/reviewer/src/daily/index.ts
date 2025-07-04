import { getYesterdayDate, dailyReviewHandler } from "./handler";
import { dbClient } from "@repo/db/client";
import { getReviewerRuntimeConfig } from "@repo/config";

export default {
  async fetch(): Promise<Response> {
    return new Response("This is a scheduled task handler.", {
      status: 200,
    });
  },
  scheduled: async (_, _env) => {
    const env = getReviewerRuntimeConfig({
      DATABASE_URL: _env.DATABASE_URL,
      DISCORD_ENCRYPTION_KEY: _env.DISCORD_ENCRYPTION_KEY,
    });
    const db = dbClient(env.DATABASE_URL);
    const discordEncryptionKey = env.DISCORD_ENCRYPTION_KEY;

    try {
      const targetDate = getYesterdayDate(new Date());
      console.info(`Starting daily digest processing for date: ${targetDate}`);

      const result = await dailyReviewHandler(
        db,
        discordEncryptionKey,
        targetDate
      );

      console.info(
        `Daily digest processing completed for date: ${targetDate}`,
        {
          ...result,
          success: true,
        }
      );
    } catch (error) {
      console.error("Daily digest batch processing failed:", error);
    }
  },
} satisfies ExportedHandler<Env>;
