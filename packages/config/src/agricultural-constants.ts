/**
 * 天候の選択肢（キー: 内部値、値: 表示名）
 */
export const WEATHER_OPTIONS = {
  SUNNY: "晴れ",
  CLOUDY: "曇り",
  RAINY: "雨",
  SNOWY: "雪",
  PARTLY_CLOUDY: "晴れ時々曇り",
  CLOUDY_THEN_RAINY: "曇り時々雨",
} as const;

/**
 * 作業種別の選択肢（キー: 内部値、値: 表示名）
 */
export const WORK_TYPE_OPTIONS = {
  SEEDING: "種まき",
  PLANTING: "植付け",
  WATERING: "水やり",
  WEEDING: "除草",
  FERTILIZING: "施肥",
  SPRAYING: "農薬散布",
  HARVESTING: "収穫",
  PRUNING: "剪定",
  OTHER: "その他",
} as const;

// 表示用の配列（UIコンポーネントで使用）
export const WEATHER_DISPLAY_OPTIONS = Object.entries(WEATHER_OPTIONS).map(
  ([key, label]) => ({ value: key, label })
);

export const WORK_TYPE_DISPLAY_OPTIONS = Object.entries(WORK_TYPE_OPTIONS).map(
  ([key, label]) => ({ value: key, label })
);

// TypeScript型として利用可能にする
export type WeatherKey = keyof typeof WEATHER_OPTIONS;
export type WorkTypeKey = keyof typeof WORK_TYPE_OPTIONS;
