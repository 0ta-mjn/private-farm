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
