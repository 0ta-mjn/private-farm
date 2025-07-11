import { SupportedSensorProperty } from "@repo/config";
import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  unique,
} from "drizzle-orm/sqlite-core";

// ============================================================================
// CORE TABLES
// ============================================================================

/**
 * 観測データテーブル
 *
 * 観測データはセンサーごとに保存され、センサーIDとタイムスタンプで一意に識別されます。
 * 各観測データは、センサーのプロパティ（温度、湿度など）とその値を含みます。
 */

export const observationsTable = sqliteTable(
  "observations",
  {
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    deduplicationId: text("deduplication_id").notNull(),
    propertyType: text("property_type")
      .$type<SupportedSensorProperty>()
      .notNull(),
    devEui: text("deveui").notNull(), // デバイスのEUI（ユニークな識別子）
    timestamp: integer("timestamp", { mode: "timestamp" }).notNull(), // UNIXタイムスタンプ（ミリ秒単位）
    value: real("value").notNull(),
  },
  (table) => ({
    sensorIdTimestampIndex: index("idx_sensor_id_timestamp").on(
      table.devEui,
      table.timestamp
    ),
    propertyTypeIndex: index("idx_property_type").on(table.propertyType),
    uniqueDeduplicationIdProperty: unique().on(
      table.deduplicationId,
      table.propertyType
    ),
  })
);

/**
 * デバイス情報テーブル
 */

export const devicesInfoTable = sqliteTable(
  "devices_info",
  {
    devEui: text("deveui").primaryKey().notNull(), // デバイスのEUI（ユニークな識別子）
    name: text("name").notNull(), // デバイスの名前
    applicationId: text("application_id"), // アプリケーションID
    applicationName: text("application_name"), // アプリケーション名
  },
  (table) => ({
    devEuiIndex: index("idx_deveui").on(table.devEui),
  })
);
