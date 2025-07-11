import { DeviceInfoInput, SensorDB } from "@repo/sensor-db";
import { parseMessage } from "./parser/chirpstack";

export const bulkInsertSensorData = async (
  db: SensorDB,
  messages: { event: string; data: unknown }[]
) => {
  const parsedMessages = messages.map((msg) => ({
    event: msg.event,
    data: parseMessage(msg.data),
  }));
  // Parse messages to extract sensor data
  const sensorDataArray = parsedMessages
    .map(({ data }) => {
      if (!data) return [];

      if (data.values.length === 0) {
        console.warn("No valid sensor values found in message:", data);
        return [];
      }

      return data.values.map(([type, value]) => ({
        deduplicationId: data.deduplicationId,
        time: data.time,
        devEui: data.deviceInfo.devEui,
        type: type,
        value: value,
      }));
    })
    .flat();

  // Perform bulk insert using the ingest repository
  await db.ingest.bulkInsert(sensorDataArray);

  const devices = parsedMessages.reduce<Map<string, DeviceInfoInput>>(
    (map, { data }) => {
      if (!data || !data.deviceInfo) return map;

      const { devEui, deviceName, applicationId, applicationName } =
        data.deviceInfo;
      if (!devEui) {
        console.warn("Device EUI is missing in message:", data);
        return map;
      }

      // Create or update device info
      map.set(devEui, {
        devEui,
        name: deviceName || "",
        applicationId: applicationId,
        applicationName: applicationName,
      });

      return map;
    },
    new Map()
  );
  await db.ingest.bulkUpsertDeviceInfo(Array.from(devices.values()));
};
