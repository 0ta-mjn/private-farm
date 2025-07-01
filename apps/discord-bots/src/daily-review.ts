import { Request, Response } from "express";
import {
  generateDailyDigestMessage,
  getDailyDigestData,
  getOrganizationsWithNotification,
  sendMessageViaWebhook,
} from "@repo/core";
import { dbClient } from "@repo/db/client";

/**
 * 前日の日付を YYYY-MM-DD 形式で取得
 */
function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  return yesterday.toISOString().split("T")[0]!;
}

const SLEEP_AFTER_ORG = 1000; // 組織間の待機時間（ミリ秒）

/**
 * 全組織の日次ダイジェストを一括送信するハンドラー
 * Cloud Schedulerなどから毎日05:30 JSTに実行される想定
 */
export const handler = async (_: Request, res: Response) => {
  const db = dbClient(process.env.DATABASE_URL);

  try {
    const discordEncryptionKey = process.env.DISCORD_ENCRYPTION_KEY;
    if (!discordEncryptionKey) {
      throw new Error(
        "DISCORD_ENCRYPTION_KEY is not set in environment variables"
      );
    }

    // 前日の日付を取得
    const targetDate = getYesterdayDate();

    console.log(`Starting daily digest processing for date: ${targetDate}`);

    // 日次通知が有効な組織とチャンネル情報を取得
    const orgsWithDailyNotification = await getOrganizationsWithNotification(
      db,
      "daily"
    );

    if (orgsWithDailyNotification.length === 0) {
      console.log("No organizations with daily notification enabled");
      res.json({
        success: true,
        message: "日次通知が有効な組織がありません",
        processedCount: 0,
      });
      return;
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
        const digestData = await getDailyDigestData(
          db,
          org.organizationId,
          targetDate
        );

        // Discordメッセージを生成
        const message = generateDailyDigestMessage(digestData);

        // 各チャンネルに送信
        const sendResults = await Promise.allSettled(
          org.channels.map((channel) =>
            sendMessageViaWebhook(
              db,
              discordEncryptionKey,
              channel.channelUuid,
              message
            ).catch((error) => {
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
          await new Promise((resolve) => setTimeout(resolve, SLEEP_AFTER_ORG));
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

    res.json({
      success: true,
      message: `日次ダイジェスト処理が完了しました (${targetDate})`,
      processedCount: results.length,
      successCount: totalSuccessCount,
      failureCount: totalFailureCount,
    });
  } catch (error) {
    console.error("Daily digest batch processing failed:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
