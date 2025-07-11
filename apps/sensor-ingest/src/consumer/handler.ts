import { DeviceInfoInput, SensorDB } from "@repo/sensor-db";
import { parseMessage } from "./parser/chirpstack";
import { EnQueuedMessage } from "../interfaces";

export const bulkInsertSensorData = async (
  db: SensorDB,
  messages: EnQueuedMessage[]
) => {
  const parsedMessages = messages.map((msg) => ({
    event: msg.event,
    data: parseMessage(msg.data),
  }));
  // Parse messages to extract sensor data
  const sensorDataArray = parsedMessages
    .map(({ data }) => {
      if (!data) return [];

      if (!data.values || data.values.length === 0) {
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

  // ソートして最新のデバイス情報のみを保持
  const devices = parsedMessages
    .filter(({ data }) => data && data.deviceInfo?.devEui)
    .sort((a, b) => {
      const timeA = a.data?.time ? new Date(a.data.time).getTime() : 0;
      const timeB = b.data?.time ? new Date(b.data.time).getTime() : 0;
      return timeB - timeA; // 新しい順
    })
    .reduce<Map<string, DeviceInfoInput>>((map, { data }) => {
      if (!data) return map;
      const { devEui, deviceName, applicationId, applicationName } =
        data.deviceInfo;
      if (!devEui) return map;
      if (!map.has(devEui)) {
        map.set(devEui, {
          devEui,
          name: deviceName || "",
          applicationId,
          applicationName,
        });
      }
      return map;
    }, new Map());

  await db.ingest.bulkUpsertDeviceInfo(Array.from(devices.values()));
};
