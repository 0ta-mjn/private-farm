import { createDashboardDBClient } from "@repo/dashboard-db/client";
import { getYesterdayDate, dailyReviewHandler } from "./handler";
import { getReviewerRuntimeConfig } from "@repo/config";

interface Env {
  DashboardDB: D1Database;
  ENCRYPTION_KEY: string;
}

export default {
  async fetch(): Promise<Response> {
    return new Response("This is a scheduled task handler.", {
      status: 200,
    });
  },
  scheduled: async (_, _env) => {
    const env = getReviewerRuntimeConfig({
      ENCRYPTION_KEY: _env.ENCRYPTION_KEY,
    });
    const db = createDashboardDBClient({
      type: "d1",
      params: {
        encryptionKey: env.ENCRYPTION_KEY,
        d1: _env.DashboardDB,
      },
    });

    try {
      const targetDate = getYesterdayDate(new Date());
      console.info(`Starting daily digest processing for date: ${targetDate}`);

      const result = await dailyReviewHandler(db, targetDate);

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
