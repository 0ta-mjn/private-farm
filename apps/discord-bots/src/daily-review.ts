import { Request, Response } from "express";
import { getOrganizationsWithNotification, sendDailyDigest } from "@repo/core";
import { dbClient } from "@repo/db/client";

/**
 * 前日の日付を YYYY-MM-DD 形式で取得
 */
function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  return yesterday.toISOString().split("T")[0]!;
}

/**
 * 全組織の日次ダイジェストを一括送信するハンドラー
 * Cloud Schedulerなどから毎日05:30 JSTに実行される想定
 */
export const handler = async (req: Request, res: Response) => {
  const db = dbClient();

  try {
    // 前日の日付を取得
    const targetDate = getYesterdayDate();

    console.log(`Starting daily digest processing for date: ${targetDate}`);

    // 日次通知が有効な組織とチャンネル情報を取得
    const organizationsWithDailyNotification =
      await getOrganizationsWithNotification(db, "daily");

    if (organizationsWithDailyNotification.length === 0) {
      console.log("No organizations with daily notification enabled");
      res.json({
        success: true,
        message: "日次通知が有効な組織がありません",
        processedCount: 0,
      });
      return;
    }

    console.log(
      `Found ${organizationsWithDailyNotification.length} organizations with daily notification enabled`
    );

    // 各組織に対して日次ダイジェストを送信（レート制限対策でシーケンシャル実行）
    const results = [];
    let totalSuccessCount = 0;
    let totalFailureCount = 0;
    const errors = [];

    for (const org of organizationsWithDailyNotification) {
      try {
        console.log(
          `Processing daily digest for org: ${org.organizationName} (${org.organizationId}), channels: ${org.channels.length}`
        );

        const result = await sendDailyDigest(
          db,
          process.env.DISCORD_ENCRYPTION_KEY!,
          org,
          targetDate
        );
        results.push({ status: "fulfilled" as const, value: result });

        totalSuccessCount += result.successCount || 0;
        totalFailureCount += result.failureCount || 0;

        if (!result.success) {
          errors.push(result.error || "Unknown error");
        }

        // レート制限対策: 組織間で少し待機
        if (org.channels.length > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(
          `Failed to process daily digest for org: ${org.organizationId}`,
          error
        );
        results.push({
          status: "rejected" as const,
          reason: error instanceof Error ? error : new Error("Unknown error"),
        });
        totalFailureCount += org.channels.length;
        errors.push(error instanceof Error ? error.message : "Unknown error");
      }
    }

    const organizationFailures = results.filter(
      (result) =>
        result.status === "rejected" ||
        (result.status === "fulfilled" && !result.value.success)
    ).length;

    console.log(
      `Daily digest processing completed. Success: ${totalSuccessCount}, Failures: ${totalFailureCount}`
    );

    if (errors.length > 0) {
      console.error("Errors during daily digest processing:", errors);
    }

    res.json({
      success: true,
      message: `日次ダイジェスト処理が完了しました (${targetDate})`,
      processedCount: results.length,
      successCount: totalSuccessCount,
      failureCount: totalFailureCount,
      organizationFailures,
      errors: errors.length > 0 ? errors : undefined,
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
