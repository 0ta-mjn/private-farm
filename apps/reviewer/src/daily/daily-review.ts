import { type Database } from "@repo/db/client";
import { eq, and, desc, count, sum } from "@repo/db";
import {
  diariesTable,
  thingsTable,
  diaryThingsTable,
  usersTable,
} from "@repo/db/schema";
import { WORK_TYPE_OPTIONS, workTypeOptions } from "@repo/config";
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
export function getWorkType(workType: string | null) {
  // 設定からworkTypeを取得して対応するiconを返す
  const parsedWorkType = workTypeOptions.safeParse(workType);
  const key = parsedWorkType.success
    ? parsedWorkType.data
    : workTypeOptions.enum.OTHER;
  return WORK_TYPE_OPTIONS[key];
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

export type DailyDigestOptions = {
  baseUrl?: string; // ダッシュボードのベースURL
};

/**
 * Discord用の日次ダイジェストメッセージを生成
 */
export function generateDailyDigestMessage(
  data: DailyDigestData,
  options: DailyDigestOptions = {}
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
      text: "今日はどんな作業をしますか？",
    },
  };

  /* 作業種別サマリー */
  if (workTypeSummary.length) {
    embed.fields!.push({
      name: "🗒️ 作業種別サマリー",
      value: workTypeSummary
        .map((item) => {
          const type = getWorkType(item.workType);
          return `${type.icon} ${type.label} ${item.count} (${formatDuration(item.totalDuration)})`;
        })
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

  /* 明細 */
  if (recentEntries.length) {
    embed.fields!.push({
      name: `作業明細`,
      value: recentEntries
        .slice(0, 5)
        .map((entry) => {
          const fieldsTxt = entry.fieldNames.join(", ") || "未指定";
          const type = getWorkType(entry.workType);
          const title = entry.title || type.label || "作業記録";
          return `• ${fieldsTxt} ${type.icon} ${title}`;
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
