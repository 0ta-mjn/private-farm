import { z } from "zod";
import { SupportedSensorProperty } from "@repo/config";

export const LoRaWANSensorData = z.object({
  deduplicationId: z.string(),
  time: z.date(), // ISO-8601
  deviceInfo: z.object({
    devEui: z.string().regex(/^[0-9A-Fa-f]{16}$/),
    deviceName: z.string(),
    applicationId: z.string().optional(),
    applicationName: z.string().optional(),
  }),
  /** デコード済みペイロード。key=property_type, value=measurement */
  values: z.tuple([SupportedSensorProperty, z.number()]).array().nullable(),
});
export type LoRaWANSensorData = z.infer<typeof LoRaWANSensorData>;

export type EnQueuedMessage = {
  event: "up" | "join" | "status";
  data: unknown;
};
