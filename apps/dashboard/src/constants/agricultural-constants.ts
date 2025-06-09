import {
  WeatherKey,
  weatherOptions,
  WorkTypeKey,
  workTypeOptions,
} from "@repo/config";

/**
 * 天候の選択肢（キー: 内部値、値: 表示名）
 */
export const WEATHER_OPTIONS: Record<
  WeatherKey,
  { label: string; icon: string }
> = {
  SUNNY: { label: "晴れ", icon: "☀️" },
  CLOUDY: { label: "曇り", icon: "☁️" },
  RAINY: { label: "雨", icon: "🌧️" },
  SNOWY: { label: "雪", icon: "❄️" },
  PARTLY_CLOUDY: { label: "晴れ時々曇り", icon: "⛅" },
  CLOUDY_THEN_RAINY: { label: "曇りのち雨", icon: "🌦️" },
};

/**
 * 作業種別の選択肢（キー: 内部値、値: 表示名）
 */
export const WORK_TYPE_OPTIONS: Record<
  WorkTypeKey,
  { label: string; color: string }
> = {
  SEEDING: { label: "播種", color: "green" },
  PLANTING: { label: "植付け", color: "blue" },
  WATERING: { label: "水やり", color: "cyan" },
  WEEDING: { label: "除草", color: "yellow" },
  FERTILIZING: { label: "施肥", color: "orange" },
  SPRAYING: { label: "散布", color: "purple" },
  HARVESTING: { label: "収穫", color: "red" },
  PRUNING: { label: "剪定", color: "pink" },
  OTHER: { label: "その他", color: "gray" },
};

// 表示用の配列（UIコンポーネントで使用）
export const WEATHER_DISPLAY_OPTIONS = Object.entries(WEATHER_OPTIONS).map(
  ([key, label]) => ({ ...label, value: key })
);

export const WORK_TYPE_DISPLAY_OPTIONS = Object.entries(WORK_TYPE_OPTIONS).map(
  ([key, label]) => ({ ...label, value: key })
);

export const getWorkTypeDisplay = (
  workType: string | null | undefined
): { label: string; color?: string } | null => {
  if (!workType) return null;
  const parsed = workTypeOptions.safeParse(workType).data;
  return parsed ? WORK_TYPE_OPTIONS[parsed] : WORK_TYPE_OPTIONS["OTHER"]!;
};

export const getWeatherDisplay = (
  weather: string | null | undefined
): { label: string; icon?: string } | null => {
  if (!weather) return null;
  const parsed = weatherOptions.safeParse(weather).data;
  return parsed ? WEATHER_OPTIONS[parsed] : null;
};
