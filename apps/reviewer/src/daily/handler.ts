import { sendViaWebhook } from "@repo/discord";
import { DailyDigestOptions, generateDailyDigestMessage } from "./daily-review";
import { DashboardDB } from "@repo/dashboard-db/interfaces";

/**
 * 前日の日付を YYYY-MM-DD 形式で取得
 */
export function getYesterdayDate(date: Date): string {
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);

  return yesterday.toISOString().split("T")[0]!;
}

/**
 * 全組織の日次ダイジェストを一括送信するハンドラー
 * Cloud Schedulerなどから毎日05:30 JSTに実行される
 */
export async function dailyReviewHandler(
  db: DashboardDB,
  targetDate: string,
  {
    sleepAfterOrg = 1000,
    ...options
  }: DailyDigestOptions & {
    sleepAfterOrg?: number; // 組織間の待機時間（ミリ秒）
  } = {}
): Promise<{
  message: string;
  processedCount: number;
  successCount?: number;
  failureCount?: number;
}> {
  console.log(`Starting daily digest processing for date: ${targetDate}`);

  // 日次通知が有効な組織とチャンネル情報を取得
  const orgsWithDailyNotification =
    await db.organization.findAllWithNotification("daily");

  if (orgsWithDailyNotification.length === 0) {
    console.log("No organizations with daily notification enabled");
    return {
      message: "日次通知が有効な組織がありません",
      processedCount: 0,
    };
  }

  console.log(
    `Found ${orgsWithDailyNotification.length} organizations with daily notification enabled`
  );

  // 各組織に対して日次ダイジェストを送信（レート制限対策でシーケンシャル実行）
  const results = [];
  let totalSuccessCount = 0;
  let totalFailureCount = 0;

  for (const org of orgsWithDailyNotification) {
    try {
      console.log(
        `Processing daily digest for org: ${org.organizationName} (${org.organizationId}), channels: ${org.channels.length}`
      );

      // 日次ダイジェストデータを取得
      const digestData = await db.diary.getDailyDigestData(
        org.organizationId,
        targetDate
      );

      // Discordメッセージを生成
      const message = generateDailyDigestMessage(digestData, options);

      // 各チャンネルに送信
      const sendResults = await Promise.allSettled(
        org.channels.map((channel) =>
          sendViaWebhook(channel, message).catch((error) => {
            console.error(
              `Failed to send message to channel ${channel.channelUuid} for org ${org.organizationId}`,
              error
            );
            throw error; // エラーを再スローして後でキャッチする
          })
        )
      );

      results.push(
        ...sendResults.map((result) => ({
          status: result.status,
          ...(result.status === "fulfilled"
            ? { value: result.value }
            : { reason: result.reason }),
        }))
      );

      const successCount = sendResults.filter(
        (result) => result.status === "fulfilled"
      ).length;

      totalSuccessCount += successCount;
      totalFailureCount += sendResults.length - successCount;

      // レート制限対策: 組織間で少し待機
      if (org.channels.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, sleepAfterOrg));
      }
    } catch (error) {
      console.error(
        `Failed to process daily digest for org: ${org.organizationId}`,
        error
      );
      results.push({
        status: "rejected" as const,
        reason: error,
      });
      totalFailureCount += org.channels.length;
    }
  }

  console.log(
    `Daily digest processing completed. Success: ${totalSuccessCount}, Failures: ${totalFailureCount}`
  );

  return {
    message: `日次ダイジェスト処理が完了しました (${targetDate})`,
    processedCount: results.length,
    successCount: totalSuccessCount,
    failureCount: totalFailureCount,
  };
}
