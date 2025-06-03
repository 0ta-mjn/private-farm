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

// Organization table
export const organizationsTable = pgTable("organizations", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"), // 組織説明
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User table
export const usersTable = pgTable("users", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// OrganizationMember table (ユーザーと組織の中間テーブル) - 多対多関係
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
    role: varchar("role", { length: 50 }).default("member").notNull(), // admin, member
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueUserOrg: unique("unique_user_org").on(
      table.userId,
      table.organizationId
    ),
  })
);

// Thing table (対象ほ場) - 農業日誌で対象ほ場選択に必要
export const thingsTable = pgTable("things", {
  id: varchar("thing_id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 100 }).notNull(), // field, greenhouse, etc.
  description: text("description"), // ほ場の説明
  location: varchar("location", { length: 255 }), // 所在地
  area: real("area"), // 面積（平方メートル）
  organizationId: varchar("organization_id", { length: 255 })
    .references(() => organizationsTable.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Diary table (農作業日誌)
export const diariesTable = pgTable(
  "diaries",
  {
    id: varchar("id", { length: 255 }).primaryKey(),
    date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD format
    title: varchar("title", { length: 255 }), // 作業タイトル
    content: text("content").notNull(),
    workType: varchar("work_type", { length: 100 }), // 作業種別（播種、施肥、収穫等）
    weather: varchar("weather", { length: 50 }), // 天気
    temperature: real("temperature"), // 気温
    userId: varchar("user_id", { length: 255 })
      .references(() => usersTable.id)
      .notNull(),
    organizationId: varchar("organization_id", { length: 255 })
      .references(() => organizationsTable.id)
      .notNull(),
    tags: text("tags"), // JSON array of tags - フェーズ1では作業種別、対象ほ場等
    photos: text("photos"), // JSON array of photo URLs (フェーズ1では基本実装)
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    dateIdx: index("diaries_date_idx").on(table.date),
    userDateIdx: index("diaries_user_date_idx").on(table.userId, table.date),
    orgDateIdx: index("diaries_org_date_idx").on(
      table.organizationId,
      table.date
    ),
    workTypeIdx: index("diaries_work_type_idx").on(table.workType), // フィルタリング用
  })
);

// DiaryThing table (日誌対象ほ場) - 日誌とほ場の関連
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
    uniqueDiaryThing: unique("unique_diary_thing").on(
      table.diaryId,
      table.thingId
    ),
  })
);

// Relations
export const organizationsRelations = relations(
  organizationsTable,
  ({ many }) => ({
    organizationMembers: many(organizationMembersTable),
    things: many(thingsTable),
    diaries: many(diariesTable),
  })
);

export const usersRelations = relations(usersTable, ({ many }) => ({
  organizationMembers: many(organizationMembersTable),
  diaries: many(diariesTable),
}));

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

export const thingsRelations = relations(thingsTable, ({ one, many }) => ({
  organization: one(organizationsTable, {
    fields: [thingsTable.organizationId],
    references: [organizationsTable.id],
  }),
  diaryThings: many(diaryThingsTable),
}));

export const diariesRelations = relations(diariesTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [diariesTable.userId],
    references: [usersTable.id],
  }),
  organization: one(organizationsTable, {
    fields: [diariesTable.organizationId],
    references: [organizationsTable.id],
  }),
  diaryThings: many(diaryThingsTable),
}));

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
