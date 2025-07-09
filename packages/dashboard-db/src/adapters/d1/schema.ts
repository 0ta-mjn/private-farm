/**
 * IoT農業システム データベーススキーマ定義 (D1/SQLite版)
 *
 * Phase 1: 農業日誌・ユーザー管理機能
 * - ユーザー登録・ログイン機能
 * - Organization作成機能（招待なし）
 * - 農業日誌の入力機能（日付、内容）
 * - 農業日誌のリスト表示・詳細表示画面
 *
 * @filepath packages/dashboard-db/src/adapters/d1/schema.ts
 */

import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  unique,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { DiscordNotificationSettings } from "@repo/config";

// ============================================================================
// CORE TABLES
// ============================================================================

/**
 * 組織テーブル
 *
 * 農場経営体や生産者団体などの組織を管理する。
 * 一つの組織が複数のユーザー、ほ場、日誌を持つことができる。
 */
export const organizationsTable = sqliteTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(), // 組織名（例：○○農場、○○生産組合）
  description: text("description").default(""), // 組織の説明・概要
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

/**
 * ユーザーテーブル
 *
 * システムを利用する農業従事者や管理者の情報を管理する。
 * 一人のユーザーが複数の組織に所属することが可能（多対多関係）。
 */
export const usersTable = sqliteTable("users", {
  id: text("id").primaryKey(), // Supabase Auth UUIDと連携
  name: text("name").notNull(), // 表示名
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

/**
 * ユーザー外部アカウント連携テーブル
 *
 * ユーザーの外部サービス（Discord、GitHub等）との連携情報を管理する。
 * 一人のユーザーが複数の外部サービスと連携できる。
 */
export const userExternalAccountsTable = sqliteTable(
  "user_external_accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(), // 'discord', 'github', ...
    providerUserId: text("provider_user_id").notNull(),
    displayName: text("display_name"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.provider, t.providerUserId] }),
    uniq: unique("user_provider_unique").on(t.userId, t.provider),
  })
);

// ============================================================================
// RELATIONSHIP TABLES (Many-to-Many)
// ============================================================================

/**
 * 組織メンバーテーブル（中間テーブル）
 *
 * ユーザーと組織の多対多関係を管理する。
 * 一人のユーザーが複数の組織に異なる役割で参加できる。
 *
 * @example
 * - 田中さんが「○○農場」のadmin、「□□生産組合」のmember
 */
export const organizationMembersTable = sqliteTable(
  "organization_members",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .references(() => usersTable.id, { onDelete: "cascade" })
      .notNull(),
    organizationId: text("organization_id")
      .references(() => organizationsTable.id, { onDelete: "cascade" })
      .notNull(),
    role: text("role").default("member").notNull(), // admin: 管理者, member: 一般メンバー
    latestViewedAt: integer("latest_viewed_at", { mode: "timestamp" }), // 最後に組織を閲覧した日時
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    // 同一ユーザーが同一組織に重複して所属することを防ぐ
    uniqueUserOrg: unique("unique_user_org").on(
      table.userId,
      table.organizationId
    ),
  })
);

// ============================================================================
// AGRICULTURAL DOMAIN TABLES
// ============================================================================

/**
 * 対象ほ場（Thing）テーブル
 *
 * 農業日誌の対象となるほ場（田んぼ、畑、ハウス等）を管理する。
 * センサーの設置場所やデータ収集の単位ともなる。
 *
 * @note 設計書のERDでは「Thing」だが、農業文脈では「ほ場」と理解
 */
export const thingsTable = sqliteTable("things", {
  id: text("thing_id").primaryKey(),
  name: text("name").notNull(), // ほ場名（例：第1圃場、南のハウス）
  type: text("type").notNull(), // field: 露地, greenhouse: ハウス, paddy: 水田 等
  description: text("description").default(""), // ほ場の詳細説明（土質、過去の作付け履歴等）
  location: text("location"), // 所在地（住所や GPS座標）
  area: real("area"), // 面積（平方メートル）
  organizationId: text("organization_id")
    .references(() => organizationsTable.id, { onDelete: "cascade" })
    .notNull(), // どの組織が管理するほ場か
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

/**
 * 農作業日誌テーブル
 *
 * 日々の農作業内容を記録する。Phase 1の中核機能。
 * 設計書要件：日付、作業内容、対象ほ場の選択、タグ付け機能（作業種別、対象ほ場）
 *
 */
export const diariesTable = sqliteTable(
  "diaries",
  {
    id: text("id").primaryKey(),
    date: text("date").notNull(), // YYYY-MM-DD 形式（日付での検索・ソートが頻繁）
    title: text("title"), // 作業タイトル（例：「トマト定植作業」）
    content: text("content").default(""), // 作業内容の詳細（任意）
    workType: text("work_type"), // 作業種別（播種、施肥、収穫、防除等）
    weather: text("weather"), // 作業日の天気（晴れ、曇り、雨等）
    temperature: real("temperature"), // 作業日の気温（℃）
    duration: real("duration"), // 作業時間（時間単位、例：1.5時間）

    // 関係性フィールド
    userId: text("user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }), // 日誌作成者
    organizationId: text("organization_id")
      .references(() => organizationsTable.id, { onDelete: "cascade" })
      .notNull(), // 日誌が属する組織（設計書 ERD に従い）

    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    // パフォーマンス最適化のためのインデックス
    dateIdx: index("diaries_date_idx").on(table.date), // 日付順表示用
    userDateIdx: index("diaries_user_date_idx").on(table.userId, table.date), // ユーザー別表示用
    orgDateIdx: index("diaries_org_date_idx").on(
      table.organizationId,
      table.date
    ), // 組織別表示用
    workTypeIdx: index("diaries_work_type_idx").on(table.workType), // 作業種別フィルタリング用
  })
);

/**
 * 日誌対象ほ場テーブル（中間テーブル）
 *
 * 農作業日誌と対象ほ場の多対多関係を管理する。
 * 一つの日誌で複数のほ場を対象にできる（例：複数圃場での同時作業）。
 *
 * @note 複合主キー(diaryId, thingId)を使用して重複を防ぎ、パフォーマンスを向上
 *
 * @example
 * - 「トマト定植」日誌 → 第1圃場、第2圃場
 * - 「追肥作業」日誌 → ハウス1のみ
 */
export const diaryThingsTable = sqliteTable(
  "diary_things",
  {
    diaryId: text("diary_id")
      .references(() => diariesTable.id, { onDelete: "cascade" })
      .notNull(),
    thingId: text("thing_id")
      .references(() => thingsTable.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    // 複合主キー：同一日誌に同一ほ場が重複して関連付けられることを防ぐ
    pk: primaryKey({ columns: [table.diaryId, table.thingId] }),
  })
);

// ============================================================================
// DISCORD INTEGRATION TABLES
// ============================================================================

/**
 * Discord チャンネルテーブル
 *
 * 組織とDiscord通知先チャンネルの関係を管理する。
 * Discord Botのインストールによる通知連携機能。
 * 一つの組織が複数のDiscordチャンネルに通知を送信できる。
 */
export const discordChannelsTable = sqliteTable(
  "discord_channels",
  {
    id: text("id").primaryKey(), // UUID形式のチャンネル識別子
    organizationId: text("organization_id")
      .references(() => organizationsTable.id, { onDelete: "cascade" })
      .notNull(), // 直接組織と紐付け
    channelId: text("channel_id").notNull(), // Discord Channel ID
    name: text("channel_name").notNull(), // Discord Channel 名
    guildId: text("guild_id").notNull(), // Discord Guild (Server) ID
    guildName: text("guild_name").notNull().default(""), // Discord Guild 名
    webhookId: text("webhook_id"), // Webhook ID（オプション）
    webhookTokenEnc: text("webhook_token_enc"), // 暗号化されたWebhookトークン（オプション）
    mentionRoleId: text("mention_role_id"), // メンション対象のRole ID（オプション）
    notificationSettings: text("notification_settings", { mode: "json" })
      .$type<DiscordNotificationSettings>()
      .notNull()
      .$defaultFn(() => ({})), // 通知設定（JSON as text）
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    // 同一組織が同一チャンネルに重複して登録されることを防ぐ
    uniqueOrgChannel: unique("unique_org_channel").on(
      table.organizationId,
      table.channelId
    ),
    organizationIdx: index("discord_channels_organization_idx").on(
      table.organizationId
    ),
    guildIdx: index("discord_channels_guild_idx").on(table.guildId),
    channelIdx: index("discord_channels_channel_idx").on(table.channelId),
  })
);

// ============================================================================
// RELATIONS CONFIGURATION
// ============================================================================

/**
 * 組織テーブルのリレーション定義
 *
 * 一つの組織は以下を持つ：
 * - 複数のメンバー（organizationMembers経由）
 * - 複数のほ場（things）
 * - 複数の日誌（diaries）
 * - 複数のDiscordチャンネル（discordChannels）
 */
export const organizationsRelations = relations(
  organizationsTable,
  ({ many }) => ({
    organizationMembers: many(organizationMembersTable), // 組織→メンバー関係
    things: many(thingsTable), // 組織→ほ場関係
    diaries: many(diariesTable), // 組織→日誌関係
    discordChannels: many(discordChannelsTable), // 組織→Discordチャンネル関係
  })
);

/**
 * ユーザーテーブルのリレーション定義
 *
 * 一人のユーザーは以下を持つ：
 * - 複数の組織メンバーシップ（organizationMembers経由）
 * - 複数の日誌（diaries）
 * - 複数の外部アカウント連携（userExternalAccounts）
 */
export const usersRelations = relations(usersTable, ({ many }) => ({
  organizationMembers: many(organizationMembersTable), // ユーザー→組織メンバーシップ関係
  diaries: many(diariesTable), // ユーザー→日誌関係
  userExternalAccounts: many(userExternalAccountsTable), // ユーザー→外部アカウント関係
}));

/**
 * 組織メンバーテーブルのリレーション定義
 *
 * 各メンバーシップレコードは以下を参照：
 * - 一人のユーザー
 * - 一つの組織
 */
export const organizationMembersRelations = relations(
  organizationMembersTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [organizationMembersTable.userId],
      references: [usersTable.id],
    }),
    organization: one(organizationsTable, {
      fields: [organizationMembersTable.organizationId],
      references: [organizationsTable.id],
    }),
  })
);

/**
 * ほ場テーブルのリレーション定義
 *
 * 各ほ場は以下を持つ：
 * - 一つの組織（organization）
 * - 複数の日誌関連付け（diaryThings経由）
 */
export const thingsRelations = relations(thingsTable, ({ one, many }) => ({
  organization: one(organizationsTable, {
    fields: [thingsTable.organizationId],
    references: [organizationsTable.id],
  }),
  diaryThings: many(diaryThingsTable), // ほ場→日誌関連付け関係
}));

/**
 * 日誌テーブルのリレーション定義
 *
 * 各日誌は以下を持つ：
 * - 一人の作成者（user）
 * - 一つの組織（organization）
 * - 複数のほ場関連付け（diaryThings経由）
 */
export const diariesRelations = relations(diariesTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [diariesTable.userId],
    references: [usersTable.id],
  }),
  organization: one(organizationsTable, {
    fields: [diariesTable.organizationId],
    references: [organizationsTable.id],
  }),
  diaryThings: many(diaryThingsTable), // 日誌→ほ場関連付け関係
}));

/**
 * 日誌ほ場関連付けテーブルのリレーション定義
 *
 * 各関連付けレコードは以下を参照：
 * - 一つの日誌
 * - 一つのほ場
 */
export const diaryThingsRelations = relations(diaryThingsTable, ({ one }) => ({
  diary: one(diariesTable, {
    fields: [diaryThingsTable.diaryId],
    references: [diariesTable.id],
  }),
  thing: one(thingsTable, {
    fields: [diaryThingsTable.thingId],
    references: [thingsTable.id],
  }),
}));

/**
 * ユーザー外部アカウント連携テーブルのリレーション定義
 *
 * 各外部アカウント連携レコードは以下を参照：
 * - 一人のユーザー
 */
export const userExternalAccountsRelations = relations(
  userExternalAccountsTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [userExternalAccountsTable.userId],
      references: [usersTable.id],
    }),
  })
);

/**
 * Discord チャンネルテーブルのリレーション定義
 *
 * 各チャンネルレコードは以下を参照：
 * - 一つの組織（organization）
 */
export const discordChannelsRelations = relations(
  discordChannelsTable,
  ({ one }) => ({
    organization: one(organizationsTable, {
      fields: [discordChannelsTable.organizationId],
      references: [organizationsTable.id],
    }),
  })
);
