import { z } from "zod";
import { SupportedSensorProperty } from "@repo/config";

/* === DTO === */
export const SensorData = z.object({
  deduplicationId: z.string(),
  time: z.date(), // ISO-8601
  devEui: z.string(),
  type: SupportedSensorProperty,
  value: z.number(),
});
export type SensorData = z.infer<typeof SensorData>;

export const DeviceInfoInput = z.object({
  devEui: z.string(),
  name: z.string(),
  applicationId: z.string().optional(),
  applicationName: z.string().optional(),
});
export type DeviceInfoInput = z.infer<typeof DeviceInfoInput>;

/* === Repository interface === */
export interface SensorIngestRepository {
  bulkInsert(sensorDataArray: SensorData[]): Promise<void>;
  bulkUpsertDeviceInfo(deviceInfo: DeviceInfoInput[]): Promise<void>;
}
