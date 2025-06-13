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
  SUNNY: { label: "晴れ", icon: "☀️" },
  CLOUDY: { label: "曇り", icon: "☁️" },
  RAINY: { label: "雨", icon: "🌧️" },
  SNOWY: { label: "雪", icon: "❄️" },
  PARTLY_CLOUDY: { label: "晴れ時々曇り", icon: "⛅" },
  CLOUDY_THEN_RAINY: { label: "曇りのち雨", icon: "🌦️" },
};

export const WORK_TYPE_OPTIONS: Record<
  WorkTypeKey,
  { label: string; color: string }
> = {
  SEEDING: { label: "播種", color: "#047857" }, // emerald-700
  PLANTING: { label: "植付け", color: "#0369A1" }, // sky-700
  WATERING: { label: "水やり", color: "#0891B2" }, // cyan-600
  WEEDING: { label: "除草", color: "#65A30D" }, // lime-600
  FERTILIZING: { label: "施肥", color: "#CA8A04" }, // amber-600
  SPRAYING: { label: "散布", color: "#6D28D9" }, // purple-700
  HARVESTING: { label: "収穫", color: "#B91C1C" }, // red-700
  PRUNING: { label: "剪定", color: "#DB2777" }, // pink-600
  OTHER: { label: "その他", color: "#4B5563" }, // slate-600
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

export const getThingTypeDisplay = (
  thingType: string | null | undefined
): { label: string; color?: string } | null => {
  if (!thingType) return null;
  const parsed = thingTypeOptions.safeParse(thingType).data;
  return parsed ? THING_TYPE_OPTIONS[parsed] : THING_TYPE_OPTIONS["OTHER"]!;
};
