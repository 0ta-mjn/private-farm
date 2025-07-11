import {
  SensorIngestRepository,
  SensorData,
  DeviceInfoInput,
} from "../../../interfaces/ingest";
import { devicesInfoTable, observationsTable } from "../schema";
import { Database } from "../client";

export class D1SensorIngestRepository implements SensorIngestRepository {
  constructor(private db: Database) {}

  async bulkInsert(sensorDataArray: SensorData[]): Promise<void> {
    if (sensorDataArray.length === 0) {
      return;
    }

    // バルクインサートを実行. duduplicationIdとpropertyTypeの組み合わせで一意制約を適用
    await this.db
      .insert(observationsTable)
      .values(
        sensorDataArray.map((sensorData) => ({
          deduplicationId: sensorData.deduplicationId,
          propertyType: sensorData.type,
          devEui: sensorData.devEui,
          timestamp: sensorData.time,
          value: sensorData.value,
        }))
      )
      .onConflictDoNothing();
  }

  async bulkUpsertDeviceInfo(
    deviceInfoArray: DeviceInfoInput[]
  ): Promise<void> {
    if (deviceInfoArray.length === 0) {
      return;
    }

    // デバイス情報をupsert（存在する場合は更新、存在しない場合は挿入）
    for (const deviceInfo of deviceInfoArray) {
      await this.db
        .insert(devicesInfoTable)
        .values({
          devEui: deviceInfo.devEui,
          name: deviceInfo.name,
          applicationId: deviceInfo.applicationId || null,
          applicationName: deviceInfo.applicationName || null,
        })
        .onConflictDoUpdate({
          target: devicesInfoTable.devEui,
          set: {
            name: deviceInfo.name,
            applicationId: deviceInfo.applicationId || null,
            applicationName: deviceInfo.applicationName || null,
          },
        });
    }
  }
}
