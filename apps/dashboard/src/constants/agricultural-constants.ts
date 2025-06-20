import {
  WeatherKey,
  weatherOptions,
  WorkTypeKey,
  workTypeOptions,
  ThingTypeKey,
  thingTypeOptions,
} from "@repo/config";

export const WEATHER_OPTIONS: Record<
  WeatherKey,
  { label: string; icon: string }
> = {
  CLEAR: { label: "快晴・雲ほぼ無し", icon: "☀️" },
  PARTLY_CLOUDY: { label: "薄曇り・晴れ時々くもり", icon: "⛅" },
  CLOUDY: { label: "くもり", icon: "☁️" },
  LIGHT_RAIN: { label: "小雨・霧雨", icon: "🌦️" },
  RAIN: { label: "通常の雨", icon: "🌧️" },
  HEAVY_RAIN: { label: "大雨・豪雨・雷雨", icon: "⛈️" },
  SNOW: { label: "降雪・みぞれ", icon: "❄️" },
  STORM: { label: "強風・台風・荒天", icon: "🌪️" },
  OTHER: { label: "その他（天候不明・記録なし）", icon: "❓" },
};

export const WORK_TYPE_OPTIONS: Record<
  WorkTypeKey,
  { label: string; color: string; icon: string }
> = {
  SOIL_PREPARATION: { label: "土壌改良・耕起", color: "#b45309", icon: "🚜" },
  SEEDING: { label: "播種", color: "#059669", icon: "🌱" },
  TRANSPLANTING: { label: "定植・植え付け", color: "#15803d", icon: "🌿" },
  THINNING: { label: "間引き", color: "#0e7490", icon: "✂️" },
  TRELLISING: { label: "支柱・誘引・ネット設置", color: "#78716c", icon: "🏗️" },
  MULCHING: { label: "被覆・マルチ", color: "#FBBF24", icon: "🛡️" },
  IRRIGATION: { label: "潅水", color: "#0891B2", icon: "💧" },
  FERTILIZING_BASE: { label: "基肥", color: "#b91c1c", icon: "🌾" },
  FERTILIZING_TOP: { label: "追肥", color: "#c2410c", icon: "🍃" },
  WEEDING: { label: "除草", color: "#65A30D", icon: "🥀" },
  CROP_PROTECTION: { label: "農薬・防除", color: "#0369a1", icon: "🛡️" },
  FOLIAR_FEEDING: { label: "葉面散布", color: "#0f766e", icon: "💨" },
  PRUNING: { label: "剪定・摘芯", color: "#d946ef", icon: "✂️" },
  HARVESTING: { label: "収穫", color: "#f43f5e", icon: "🧺" },
  POST_HARVEST: { label: "調整・包装", color: "#FBBF24", icon: "📦" },
  EQUIP_MAINTENANCE: { label: "機械・器具点検", color: "#525252", icon: "🔧" },
  FACILITY_REPAIR: { label: "施設・設備修理", color: "#71717a", icon: "🔨" },
  SCOUTING: { label: "巡回・観察", color: "#94a3b8", icon: "👀" },
  OTHER: { label: "その他", color: "#4B5563", icon: "📝" },
};

export const THING_TYPE_OPTIONS: Record<
  ThingTypeKey,
  { label: string; color: string }
> = {
  PADDY: { label: "水田", color: "#0891B2" }, // cyan-600
  FIELD: { label: "畑（露地）", color: "#047857" }, // emerald-700
  HOUSE: { label: "温室・ハウス", color: "#0369A1" }, // sky-700
  ORCHARD: { label: "果樹園", color: "#CA8A04" }, // amber-600
  OTHER: { label: "その他", color: "#4B5563" }, // slate-600
};

// ...existing code...
export const WEATHER_DISPLAY_OPTIONS = Object.entries(WEATHER_OPTIONS).map(
  ([key, label]) => ({ ...label, value: key })
);

export const WORK_TYPE_DISPLAY_OPTIONS = Object.entries(WORK_TYPE_OPTIONS).map(
  ([key, label]) => ({ ...label, value: key })
);

export const THING_TYPE_DISPLAY_OPTIONS = Object.entries(
  THING_TYPE_OPTIONS
).map(([key, label]) => ({ ...label, value: key }));

export const getWorkTypeDisplay = (workType: string | null | undefined) => {
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

export const getThingTypeDisplay = (
  thingType: string | null | undefined
): { label: string; color?: string } | null => {
  if (!thingType) return null;
  const parsed = thingTypeOptions.safeParse(thingType).data;
  return parsed ? THING_TYPE_OPTIONS[parsed] : THING_TYPE_OPTIONS["OTHER"]!;
};
