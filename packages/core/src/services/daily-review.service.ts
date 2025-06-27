import { type Database } from "@repo/db/client";
import { eq, and, desc, count, sum } from "drizzle-orm";
import {
  diariesTable,
  thingsTable,
  diaryThingsTable,
  usersTable,
} from "@repo/db/schema";
import { WORK_TYPE_OPTIONS, workTypeOptions } from "@repo/config";
import { sendMessageViaWebhook } from "./discord.service";
import { type OrganizationWithNotification } from "./organization.service";
import { EmbedMessage, WebhookPayload } from "@repo/discord";

/**
 * 日次ダイジェストのデータ型
 */
export interface DailyDigestData {
  date: string;
  totalEntries: number;
  totalDuration: number;
  totalFields: number;
  workTypeSummary: WorkTypeSummary[];
  fieldSummary: FieldSummary[];
  recentEntries: DiaryEntry[];
}

export interface WorkTypeSummary {
  workType: string;
  count: number;
  totalDuration: number;
}

export interface FieldSummary {
  fieldName: string;
  totalDuration: number;
}

export interface DiaryEntry {
  id: string;
  title: string | null;
  workType: string | null;
  duration: number | null;
  userName: string | null;
  fieldNames: string[];
  createdAt: Date;
}

/**
 * 指定日の農業日誌データを集計する
 */
export async function getDailyDigestData(
  db: Database,
  organizationId: string,
  targetDate: string
): Promise<DailyDigestData> {
  // 1. 基本統計を取得
  const basicStats = await db
    .select({
      totalEntries: count(diariesTable.id),
      totalDuration: sum(diariesTable.duration),
    })
    .from(diariesTable)
    .where(
      and(
        eq(diariesTable.organizationId, organizationId),
        eq(diariesTable.date, targetDate)
      )
    );

  const stats = basicStats[0] || { totalEntries: 0, totalDuration: 0 };

  // 2. 作業種別サマリーを取得
  const workTypeData = await db
    .select({
      workType: diariesTable.workType,
      count: count(diariesTable.id),
      totalDuration: sum(diariesTable.duration),
    })
    .from(diariesTable)
    .where(
      and(
        eq(diariesTable.organizationId, organizationId),
        eq(diariesTable.date, targetDate)
      )
    )
    .groupBy(diariesTable.workType)
    .orderBy(desc(count(diariesTable.id)));

  // 3. ほ場別サマリーを取得
  const fieldData = await db
    .select({
      fieldName: thingsTable.name,
      totalDuration: sum(diariesTable.duration),
    })
    .from(diariesTable)
    .innerJoin(diaryThingsTable, eq(diariesTable.id, diaryThingsTable.diaryId))
    .innerJoin(thingsTable, eq(diaryThingsTable.thingId, thingsTable.id))
    .where(
      and(
        eq(diariesTable.organizationId, organizationId),
        eq(diariesTable.date, targetDate)
      )
    )
    .groupBy(thingsTable.name)
    .orderBy(desc(sum(diariesTable.duration)));

  // 4. ユニークなほ場数を取得
  const uniqueFields = await db
    .selectDistinct({ thingId: diaryThingsTable.thingId })
    .from(diariesTable)
    .innerJoin(diaryThingsTable, eq(diariesTable.id, diaryThingsTable.diaryId))
    .where(
      and(
        eq(diariesTable.organizationId, organizationId),
        eq(diariesTable.date, targetDate)
      )
    );

  // 5. 最新の日誌エントリを取得
  const recentEntries = await db
    .select({
      id: diariesTable.id,
      title: diariesTable.title,
      workType: diariesTable.workType,
      duration: diariesTable.duration,
      userName: usersTable.name,
      createdAt: diariesTable.createdAt,
    })
    .from(diariesTable)
    .leftJoin(usersTable, eq(diariesTable.userId, usersTable.id))
    .where(
      and(
        eq(diariesTable.organizationId, organizationId),
        eq(diariesTable.date, targetDate)
      )
    )
    .orderBy(desc(diariesTable.createdAt));

  // 各エントリのほ場名を取得
  const entriesWithFields = await Promise.all(
    recentEntries.map(async (entry: (typeof recentEntries)[0]) => {
      const fields = await db
        .select({ name: thingsTable.name })
        .from(diaryThingsTable)
        .innerJoin(thingsTable, eq(diaryThingsTable.thingId, thingsTable.id))
        .where(eq(diaryThingsTable.diaryId, entry.id));

      return {
        ...entry,
        fieldNames: fields.map((f: { name: string }) => f.name),
      };
    })
  );

  return {
    date: targetDate,
    totalEntries: Number(stats.totalEntries),
    totalDuration: Number(stats.totalDuration) || 0,
    totalFields: uniqueFields.length,
    workTypeSummary: workTypeData.map((item) => ({
      workType: item.workType || "未分類",
      count: Number(item.count),
      totalDuration: Number(item.totalDuration) || 0,
    })),
    fieldSummary: fieldData.map((item) => ({
      fieldName: item.fieldName,
      totalDuration: Number(item.totalDuration) || 0,
    })),
    recentEntries: entriesWithFields,
  };
}

/**
 * 作業種別にEmojiを付与（@repo/configから取得）
 */
export function getWorkTypeEmoji(workType: string): string {
  // 設定からworkTypeを取得して対応するiconを返す
  const parsedWorkType = workTypeOptions.safeParse(workType);
  const key = parsedWorkType.success
    ? parsedWorkType.data
    : workTypeOptions.enum.OTHER;
  return WORK_TYPE_OPTIONS[key].icon;
}

/**
 * 時間を時分形式にフォーマット
 */
export function formatDuration(hours: number): string {
  if (hours === 0) return "0 h";

  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);

  if (wholeHours === 0) {
    return `${minutes} m`;
  }

  if (minutes === 0) {
    return `${wholeHours} h`;
  }

  return `${wholeHours} h ${minutes} m`;
}

/**
 * 日付を日本語形式にフォーマット
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const weekday = weekdays[date.getDay()];

  return `${dateStr} (${weekday})`;
}

/**
 * Discord用の日次ダイジェストメッセージを生成
 */
export function generateDailyDigestMessage(
  data: DailyDigestData,
  options: {
    baseUrl?: string; // ダッシュボードのベースURL
  } = {}
): WebhookPayload {
  const {
    date,
    totalEntries,
    totalDuration,
    totalFields,
    workTypeSummary,
    fieldSummary,
    recentEntries,
  } = data;

  const embed: EmbedMessage = {
    title: `🌅 日次ダイジェスト | ${formatDate(date)}`,
    color: 0x4caf50, // material green 500
    timestamp: new Date(`${date}T23:59:59+09:00`).toISOString(),
    description: [
      `**作業件数:** ${totalEntries}`,
      `**総作業時間:** ${formatDuration(totalDuration)}`,
      `**ほ場:** ${totalFields}`,
    ].join("\u2003"), // em‑space で視覚的に区切る
    fields: [],
    footer: {
      text: "次の週間サマリー: 月曜 07:00 JST",
    },
  };

  /* 作業種別サマリー */
  if (workTypeSummary.length) {
    embed.fields!.push({
      name: "🗒️ 作業種別サマリー",
      value: workTypeSummary
        .map(
          (item) =>
            `${getWorkTypeEmoji(item.workType)} ${item.workType} ${item.count} (${formatDuration(item.totalDuration)})`
        )
        .join(" ・ "),
      inline: false,
    });
  }

  /* ほ場別サマリー（複数ある場合のみ） */
  if (fieldSummary.length > 1) {
    embed.fields!.push({
      name: "ほ場別作業時間",
      value: fieldSummary
        .map((f) => `${f.fieldName}: ${formatDuration(f.totalDuration)}`)
        .join(" / "),
      inline: false,
    });
  }

  /* 明細 (最新 5 件) */
  if (recentEntries.length) {
    embed.fields!.push({
      name: `作業明細 (最新 ${Math.min(recentEntries.length, 5)} 件)`,
      value: recentEntries
        .slice(0, 5)
        .map((entry) => {
          const t = entry.createdAt.toLocaleTimeString("ja-JP", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Tokyo",
          });
          const fieldsTxt = entry.fieldNames.join(", ") || "未指定";
          const emoji = getWorkTypeEmoji(entry.workType || "");
          const title = entry.title || entry.workType || "作業記録";
          return `• \`${t}\` ${fieldsTxt} ${emoji} ${title}`;
        })
        .join("\n"),
      inline: false,
    });

    /* サムネイル：写真があれば 1 枚目を使用 */
    const firstPhoto = (
      recentEntries.find((e) => "photoUrl" in e && e.photoUrl) as DiaryEntry & {
        photoUrl?: string;
      }
    )?.photoUrl;
    if (firstPhoto) {
      embed.thumbnail = { url: firstPhoto };
    }
  }

  /* ダッシュボード詳細リンク */
  if (options.baseUrl) embed.url = `${options.baseUrl}/diary?date=${date}`;

  return {
    embeds: [embed],
  };
}

/**
 * 日次ダイジェストを生成して組織の全チャンネルに送信
 */
export async function sendDailyDigest(
  db: Database,
  encryptionKey: string,
  organization: OrganizationWithNotification,
  targetDate: string
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  successCount: number;
  failureCount: number;
}> {
  try {
    // 日次ダイジェストデータを取得
    const digestData = await getDailyDigestData(
      db,
      organization.organizationId,
      targetDate
    );

    // Discordメッセージを生成
    const message = generateDailyDigestMessage(digestData);

    // 各チャンネルに送信
    const sendResults = await Promise.allSettled(
      organization.channels.map((channel) =>
        sendMessageViaWebhook(db, encryptionKey, channel.channelId, message)
      )
    );

    const successCount = sendResults.filter(
      (result) => result.status === "fulfilled"
    ).length;
    const failureCount = sendResults.length - successCount;

    return {
      success: failureCount === 0,
      message: `日次ダイジェストを送信しました（${targetDate}）: 成功 ${successCount}件、失敗 ${failureCount}件`,
      successCount,
      failureCount,
    };
  } catch (error) {
    console.error(
      `Daily digest send failed for org:${organization.organizationId}`,
      error
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      successCount: 0,
      failureCount: organization.channels.length,
    };
  }
}
