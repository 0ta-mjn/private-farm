import {
  weatherOptions,
  workTypeOptions,
  thingTypeOptions,
  WEATHER_OPTIONS,
  WORK_TYPE_OPTIONS,
  THING_TYPE_OPTIONS,
} from "@repo/config";

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
