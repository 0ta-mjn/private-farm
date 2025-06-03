/**
 * IoT農業システム データベーススキーマ定義
 *
 * Phase 1: 農業日誌・ユーザー管理機能
 * - ユーザー登録・ログイン機能
 * - Organization作成機能（招待なし）
 * - 農業日誌の入力機能（日付、内容）
 * - 農業日誌のリスト表示・詳細表示画面
 *
 * @filepath packages/db/src/schema.ts
 */

import {
  pgTable,
  varchar,
  text,
  timestamp,
  real,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { z } from "zod";

// ============================================================================
// CORE TABLES
// ============================================================================

/**
 * 組織テーブル
 *
 * 農場経営体や生産者団体などの組織を管理する。
 * 一つの組織が複数のユーザー、ほ場、日誌を持つことができる。
 */
export const organizationsTable = pgTable("organizations", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(), // 組織名（例：○○農場、○○生産組合）
  description: text("description"), // 組織の説明・概要
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * ユーザーテーブル
 *
 * システムを利用する農業従事者や管理者の情報を管理する。
 * 一人のユーザーが複数の組織に所属することが可能（多対多関係）。
 */
export const usersTable = pgTable("users", {
  id: varchar("id", { length: 255 }).primaryKey(), // Supabase Auth UUIDと連携
  name: varchar("name", { length: 255 }).notNull(), // 表示名
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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
export const organizationMembersTable = pgTable(
  "organization_members",
  {
    id: varchar("id", { length: 255 }).primaryKey(),
    userId: varchar("user_id", { length: 255 })
      .references(() => usersTable.id)
      .notNull(),
    organizationId: varchar("organization_id", { length: 255 })
      .references(() => organizationsTable.id)
      .notNull(),
    role: varchar("role", { length: 50 }).default("member").notNull(), // admin: 管理者, member: 一般メンバー
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
export const thingsTable = pgTable("things", {
  id: varchar("thing_id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(), // ほ場名（例：第1圃場、南のハウス）
  type: varchar("type", { length: 100 }).notNull(), // field: 露地, greenhouse: ハウス, paddy: 水田 等
  description: text("description"), // ほ場の詳細説明（土質、過去の作付け履歴等）
  location: varchar("location", { length: 255 }), // 所在地（住所や GPS座標）
  area: real("area"), // 面積（平方メートル）
  organizationId: varchar("organization_id", { length: 255 })
    .references(() => organizationsTable.id)
    .notNull(), // どの組織が管理するほ場か
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * 農作業日誌テーブル
 *
 * 日々の農作業内容を記録する。Phase 1の中核機能。
 * 設計書要件：日付、作業内容、対象ほ場の選択、タグ付け機能（作業種別、対象ほ場）
 *
 */
export const diariesTable = pgTable(
  "diaries",
  {
    id: varchar("id", { length: 255 }).primaryKey(),
    date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD 形式（日付での検索・ソートが頻繁）
    title: varchar("title", { length: 255 }), // 作業タイトル（例：「トマト定植作業」）
    content: text("content").notNull(), // 作業内容の詳細
    workType: varchar("work_type", { length: 100 }), // 作業種別（播種、施肥、収穫、防除等）
    weather: varchar("weather", { length: 50 }), // 作業日の天気（晴れ、曇り、雨等）
    temperature: real("temperature"), // 作業日の気温（℃）

    // 関係性フィールド
    userId: varchar("user_id", { length: 255 })
      .references(() => usersTable.id)
      .notNull(), // 日誌作成者
    organizationId: varchar("organization_id", { length: 255 })
      .references(() => organizationsTable.id)
      .notNull(), // 日誌が属する組織（設計書 ERD に従い）

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
 * @example
 * - 「トマト定植」日誌 → 第1圃場、第2圃場
 * - 「追肥作業」日誌 → ハウス1のみ
 */
export const diaryThingsTable = pgTable(
  "diary_things",
  {
    id: varchar("id", { length: 255 }).primaryKey(),
    diaryId: varchar("diary_id", { length: 255 })
      .references(() => diariesTable.id)
      .notNull(),
    thingId: varchar("thing_id", { length: 255 })
      .references(() => thingsTable.id)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    // 同一日誌に同一ほ場が重複して関連付けられることを防ぐ
    uniqueDiaryThing: unique("unique_diary_thing").on(
      table.diaryId,
      table.thingId
    ),
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
 */
export const organizationsRelations = relations(
  organizationsTable,
  ({ many }) => ({
    organizationMembers: many(organizationMembersTable), // 組織→メンバー関係
    things: many(thingsTable), // 組織→ほ場関係
    diaries: many(diariesTable), // 組織→日誌関係
  })
);

/**
 * ユーザーテーブルのリレーション定義
 *
 * 一人のユーザーは以下を持つ：
 * - 複数の組織メンバーシップ（organizationMembers経由）
 * - 複数の日誌（diaries）
 */
export const usersRelations = relations(usersTable, ({ many }) => ({
  organizationMembers: many(organizationMembersTable), // ユーザー→組織メンバーシップ関係
  diaries: many(diariesTable), // ユーザー→日誌関係
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

// ============================================================================
// ENUM CONFIGURATION
// ============================================================================

/**
 * memberのroleを定義するためのZodスキーマ
 */
export const MemberRoleSchema = z.enum(["admin"]);

// ============================================================================
// SCHEMA SUMMARY
// ============================================================================

/**
 * IoT農業システム Phase 1 スキーマサマリ
 *
 * テーブル数: 6
 * 1. organizations - 組織管理
 * 2. users - ユーザー管理
 * 3. organizationMembers - ユーザー↔組織 多対多関係
 * 4. things - ほ場管理
 * 5. diaries - 農作業日誌
 * 6. diaryThings - 日誌↔ほ場 多対多関係
 *
 * 主要な関係性:
 * - User ↔ Organization: Many-to-Many (organizationMembers経由)
 * - Diary ↔ Organization: Many-to-One
 * - Diary ↔ User: Many-to-One
 * - Diary ↔ Thing: Many-to-Many (diaryThings経由)
 * - Thing ↔ Organization: Many-to-One
 *
 * Phase 1 対応機能:
 * ✅ ユーザー登録・ログイン機能
 * ✅ Organization作成機能（招待なし）
 * ✅ 農業日誌の入力機能（日付、内容、タグ）
 * ✅ 農業日誌のリスト表示・詳細表示画面
 *
 * パフォーマンス最適化:
 * - 日付順表示用インデックス
 * - ユーザー別/組織別表示用複合インデックス
 * - 作業種別フィルタリング用インデックス
 * - unique制約による整合性保証
 *
 * 将来拡張への備え:
 * - センサーデータ連携（Phase 2）
 * - 写真添付機能拡張（Phase 5）
 * - 検索・フィルタリング機能拡張（Phase 5）
 */
