import { z } from "zod";
import { LoRaWANSensorData } from "../../interfaces";
import { SupportedSensorProperty } from "@repo/config";

const ChirpStackEvent = z.object({
  deduplicationId: z.string(),
  time: z.string(), // ISO-8601
  deviceInfo: z.object({
    devEui: z.string(),
    deviceName: z.string(),
    applicationId: z.string().optional(),
    applicationName: z.string().optional(),
  }),
  object: z
    .object({
      parsed: z.record(z.string(), z.unknown()).optional(),
    })
    .nullable()
    .optional(),
  batteryLevel: z.union([z.number(), z.string()]).optional(),
});

export const parseMessage = (message: unknown): LoRaWANSensorData | null => {
  const parsedMessage = ChirpStackEvent.safeParse(message);
  if (!parsedMessage.success) {
    console.warn("Failed to parse message:", parsedMessage.error.issues);
    console.info("Original message:", JSON.stringify(message, null, 2));
    return null;
  }

  const data = parsedMessage.data;

  const values: LoRaWANSensorData["values"] = [];
  if (data.object?.parsed) {
    for (const [key, value] of Object.entries(data.object.parsed)) {
      const supportedKey = SupportedSensorProperty.safeParse(key);
      if (!supportedKey.success) continue;
      switch (typeof value) {
        case "number":
          values.push([supportedKey.data, value]);
          break;
        case "string": {
          // If the value is a string, we can try to parse it as a number
          const parsedValue = Number(value);
          if (!isNaN(parsedValue)) {
            values.push([supportedKey.data, parsedValue]);
          } else {
            console.warn(`Skipping string value for ${key}:`, value);
          }
          break;
        }
        default:
          console.warn(`Unsupported value type for ${key}:`, value);
      }
    }
  }

  if (data.batteryLevel !== undefined) {
    const batteryLevel =
      typeof data.batteryLevel !== "number"
        ? Number(data.batteryLevel)
        : data.batteryLevel;
    if (!isNaN(batteryLevel)) {
      const batteryIndex = values.findIndex(
        ([type]) => type === "battery-percentage"
      );
      if (batteryIndex !== -1 && values[batteryIndex]) {
        values[batteryIndex][1] = batteryLevel; // Update existing battery value
      } else {
        values.push(["battery-percentage", batteryLevel]); // Add new battery value
      }
    }
  }

  return {
    deduplicationId: data.deduplicationId,
    time: new Date(data.time),
    deviceInfo: {
      devEui: data.deviceInfo.devEui,
      deviceName: data.deviceInfo.deviceName,
      applicationId: data.deviceInfo.applicationId,
      applicationName: data.deviceInfo.applicationName,
    },
    values: values.length > 0 ? values : null,
  };
};
