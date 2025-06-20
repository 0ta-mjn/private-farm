import { z } from "zod";

export const weatherOptions = z.enum([
  "CLEAR", // 快晴・雲ほぼ無し
  "PARTLY_CLOUDY", // 薄曇り・晴れ時々くもり
  "CLOUDY", // くもり（終日ほぼ日射なし）
  "LIGHT_RAIN", // 小雨・霧雨（～1 mm/h 目安）
  "RAIN", // 通常の雨（1–10 mm/h）
  "HEAVY_RAIN", // 大雨（10 mm/h 以上）／豪雨・雷雨含む
  "SNOW", // 降雪（みぞれを含む）
  "STORM", // 強風・突風・台風・雷を伴う荒天
  "OTHER", // その他（天候不明・記録なし）
]);
export type WeatherKey = z.infer<typeof weatherOptions>;

export const workTypeOptions = z.enum([
  "SOIL_PREPARATION", // 土壌改良・耕起
  "SEEDING", // 播種
  "TRANSPLANTING", // 定植・植え付け
  "THINNING", // 間引き
  "TRELLISING", // 支柱・誘引・ネット設置
  "MULCHING", // 被覆・マルチ
  "IRRIGATION", // 潅水
  "FERTILIZING_BASE", // 基肥
  "FERTILIZING_TOP", // 追肥
  "WEEDING", // 除草
  "CROP_PROTECTION", // 農薬・防除
  "FOLIAR_FEEDING", // 葉面散布
  "PRUNING", // 剪定・摘芯
  "HARVESTING", // 収穫
  "POST_HARVEST", // 調整・包装
  "EQUIP_MAINTENANCE", // 機械・器具点検
  "FACILITY_REPAIR", // 施設・設備修理
  "SCOUTING", // 巡回・観察
  "OTHER", // その他
]);
export type WorkTypeKey = z.infer<typeof workTypeOptions>;

export const thingTypeOptions = z.enum([
  "PADDY", // 水田（稲作）
  "FIELD", // 畑（露地栽培）
  "HOUSE", // ハウス（温室栽培）
  "ORCHARD", // 果樹園
  "OTHER", // その他
]);
export type ThingTypeKey = z.infer<typeof thingTypeOptions>;
