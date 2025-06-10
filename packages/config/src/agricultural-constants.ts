import { z } from "zod";

export const weatherOptions = z.enum([
  "SUNNY",
  "CLOUDY",
  "RAINY",
  "SNOWY",
  "PARTLY_CLOUDY",
  "CLOUDY_THEN_RAINY",
]);
export type WeatherKey = z.infer<typeof weatherOptions>;

export const workTypeOptions = z.enum([
  "SEEDING",
  "PLANTING",
  "WATERING",
  "WEEDING",
  "FERTILIZING",
  "SPRAYING",
  "HARVESTING",
  "PRUNING",
  "OTHER",
]);
export type WorkTypeKey = z.infer<typeof workTypeOptions>;

export const thingTypeOptions = z.enum([
  "PADDY", // 水田（稲作）
  "FIELD", // 畑（露地栽培）
  "GREENHOUSE", // ハウス（温室栽培）
  "ORCHARD", // 果樹園
  "OTHER", // その他
]);
export type ThingTypeKey = z.infer<typeof thingTypeOptions>;
