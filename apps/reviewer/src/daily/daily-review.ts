import { WORK_TYPE_OPTIONS, workTypeOptions } from "@repo/config";
import { DailyDigestData, DiaryEntry } from "@repo/dashboard-db/interfaces";
import { EmbedMessage, WebhookPayload } from "@repo/discord";

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
