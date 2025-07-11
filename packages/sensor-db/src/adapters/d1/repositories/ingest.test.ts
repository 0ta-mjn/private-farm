import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { createTestSensorD1Client } from "../testing";
import { D1SensorIngestRepository } from "./ingest";
import { observationsTable, devicesInfoTable } from "../schema";
import { SensorData, DeviceInfoInput } from "../../../interfaces/ingest";

const db = await createTestSensorD1Client();
const repo = new D1SensorIngestRepository(db);

describe("D1SensorIngestRepository", () => {
  beforeEach(async () => {
    // テストデータベースをリセット
    await db.delete(observationsTable);
    await db.delete(devicesInfoTable);
  });

  describe("bulkInsert", () => {
    it("複数のセンサーデータを正常に挿入できる", async () => {
      // Arrange
      const sensorDataArray: SensorData[] = [
        {
          deduplicationId: "sensor-1-2025-06-24-12-00",
          time: new Date("2025-06-24T12:00:00Z"),
          devEui: "1234567890ABCDEF",
          type: "soil-moisture",
          value: 25.5,
        },
        {
          deduplicationId: "sensor-1-2025-06-24-12-01",
          time: new Date("2025-06-24T12:01:00Z"),
          devEui: "1234567890ABCDEF",
          type: "soil-temperature",
          value: 22.3,
        },
        {
          deduplicationId: "sensor-2-2025-06-24-12-00",
          time: new Date("2025-06-24T12:00:00Z"),
          devEui: "FEDCBA0987654321",
          type: "air-temperature",
          value: 28.1,
        },
      ];

      // Act
      await repo.bulkInsert(sensorDataArray);

      // Assert
      const insertedData = await db
        .select()
        .from(observationsTable)
        .orderBy(observationsTable.deduplicationId);

      expect(insertedData).toHaveLength(3);
      expect(insertedData[0]?.deduplicationId).toBe("sensor-1-2025-06-24-12-00");
      expect(insertedData[0]?.propertyType).toBe("soil-moisture");
      expect(insertedData[0]?.devEui).toBe("1234567890ABCDEF");
      expect(insertedData[0]?.value).toBe(25.5);
      expect(insertedData[0]?.timestamp).toEqual(new Date("2025-06-24T12:00:00Z"));

      expect(insertedData[1]?.deduplicationId).toBe("sensor-1-2025-06-24-12-01");
      expect(insertedData[1]?.propertyType).toBe("soil-temperature");
      expect(insertedData[1]?.value).toBe(22.3);

      expect(insertedData[2]?.deduplicationId).toBe("sensor-2-2025-06-24-12-00");
      expect(insertedData[2]?.propertyType).toBe("air-temperature");
      expect(insertedData[2]?.value).toBe(28.1);
    });

    it("単一のセンサーデータを挿入できる", async () => {
      // Arrange
      const sensorDataArray: SensorData[] = [
        {
          deduplicationId: "single-sensor-data",
          time: new Date("2025-06-24T15:30:00Z"),
          devEui: "AAAAAAAAAAAAAAAA",
          type: "humidity",
          value: 65.2,
        },
      ];

      // Act
      await repo.bulkInsert(sensorDataArray);

      // Assert
      const insertedData = await db
        .select()
        .from(observationsTable)
        .where(eq(observationsTable.deduplicationId, "single-sensor-data"));

      expect(insertedData).toHaveLength(1);
      expect(insertedData[0]?.propertyType).toBe("humidity");
      expect(insertedData[0]?.value).toBe(65.2);
    });

    it("空の配列で呼び出してもエラーにならない", async () => {
      // Arrange
      const sensorDataArray: SensorData[] = [];

      // Act & Assert
      await expect(repo.bulkInsert(sensorDataArray)).resolves.not.toThrow();

      // データベースにレコードが挿入されていないことを確認
      const count = await db.select().from(observationsTable);
      expect(count).toHaveLength(0);
    });

    it("同じdeduplicationIdとpropertyTypeの組み合わせで重複した場合、重複が無視される", async () => {
      // Arrange
      const originalData: SensorData = {
        deduplicationId: "duplicate-test",
        time: new Date("2025-06-24T10:00:00Z"),
        devEui: "1111111111111111",
        type: "soil-moisture",
        value: 30.0,
      };

      const duplicateData: SensorData = {
        deduplicationId: "duplicate-test", // 同じdeduplicationId
        time: new Date("2025-06-24T11:00:00Z"), // 異なる時刻
        devEui: "2222222222222222", // 異なるdevEui
        type: "soil-moisture", // 同じpropertyType
        value: 35.0, // 異なる値
      };

      // Act
      await repo.bulkInsert([originalData]);
      await repo.bulkInsert([duplicateData]); // 重複データを挿入

      // Assert
      const records = await db
        .select()
        .from(observationsTable)
        .where(eq(observationsTable.deduplicationId, "duplicate-test"));

      // 重複が無視されて、最初のレコードのみが残る
      expect(records).toHaveLength(1);
      expect(records[0]?.value).toBe(30.0); // 最初の値が保持される
      expect(records[0]?.devEui).toBe("1111111111111111"); // 最初のdevEuiが保持される
    });

    it("異なるpropertyTypeなら同じdeduplicationIdでも挿入される", async () => {
      // Arrange
      const data1: SensorData = {
        deduplicationId: "same-id-different-type",
        time: new Date("2025-06-24T10:00:00Z"),
        devEui: "AAAAAAAAAAAAAAAA",
        type: "soil-moisture",
        value: 30.0,
      };

      const data2: SensorData = {
        deduplicationId: "same-id-different-type", // 同じdeduplicationId
        time: new Date("2025-06-24T10:00:00Z"),
        devEui: "AAAAAAAAAAAAAAAA",
        type: "soil-temperature", // 異なるpropertyType
        value: 25.0,
      };

      // Act
      await repo.bulkInsert([data1, data2]);

      // Assert
      const records = await db
        .select()
        .from(observationsTable)
        .where(eq(observationsTable.deduplicationId, "same-id-different-type"));

      expect(records).toHaveLength(2);
      const soilMoisture = records.find((r) => r.propertyType === "soil-moisture");
      const soilTemp = records.find((r) => r.propertyType === "soil-temperature");

      expect(soilMoisture?.value).toBe(30.0);
      expect(soilTemp?.value).toBe(25.0);
    });

    it("各種センサープロパティが正しく保存される", async () => {
      // Arrange
      const sensorDataArray: SensorData[] = [
        {
          deduplicationId: "test-soil-ec",
          time: new Date("2025-06-24T12:00:00Z"),
          devEui: "1234567890ABCDEF",
          type: "soil-ec",
          value: 1.2,
        },
        {
          deduplicationId: "test-precipitation",
          time: new Date("2025-06-24T12:00:00Z"),
          devEui: "1234567890ABCDEF",
          type: "precipitation",
          value: 5.8,
        },
        {
          deduplicationId: "test-wind-speed",
          time: new Date("2025-06-24T12:00:00Z"),
          devEui: "1234567890ABCDEF",
          type: "wind-speed",
          value: 3.2,
        },
        {
          deduplicationId: "test-solar-radiation",
          time: new Date("2025-06-24T12:00:00Z"),
          devEui: "1234567890ABCDEF",
          type: "solar-radiation",
          value: 850.0,
        },
        {
          deduplicationId: "test-battery-percentage",
          time: new Date("2025-06-24T12:00:00Z"),
          devEui: "1234567890ABCDEF",
          type: "battery-percentage",
          value: 85.5,
        },
      ];

      // Act
      await repo.bulkInsert(sensorDataArray);

      // Assert
      const insertedData = await db
        .select()
        .from(observationsTable)
        .orderBy(observationsTable.propertyType);

      expect(insertedData).toHaveLength(5);

      const propertyTypes = insertedData.map((d) => d.propertyType);
      expect(propertyTypes).toContain("soil-ec");
      expect(propertyTypes).toContain("precipitation");
      expect(propertyTypes).toContain("wind-speed");
      expect(propertyTypes).toContain("solar-radiation");
      expect(propertyTypes).toContain("battery-percentage");

      const batteryData = insertedData.find((d) => d.propertyType === "battery-percentage");
      expect(batteryData?.value).toBe(85.5);
    });
  });

  describe("bulkUpsertDeviceInfo", () => {
    it("新しいデバイス情報を挿入できる", async () => {
      // Arrange
      const deviceInfoArray: DeviceInfoInput[] = [
        {
          devEui: "1234567890ABCDEF",
          name: "土壌センサー1",
          applicationId: "app-001",
          applicationName: "Farm Monitoring",
        },
        {
          devEui: "FEDCBA0987654321",
          name: "気象センサー1",
          applicationId: "app-002",
          applicationName: "Weather Station",
        },
      ];

      // Act
      await repo.bulkUpsertDeviceInfo(deviceInfoArray);

      // Assert
      const insertedDevices = await db
        .select()
        .from(devicesInfoTable)
        .orderBy(devicesInfoTable.devEui);

      expect(insertedDevices).toHaveLength(2);
      expect(insertedDevices[0]?.devEui).toBe("1234567890ABCDEF");
      expect(insertedDevices[0]?.name).toBe("土壌センサー1");
      expect(insertedDevices[0]?.applicationId).toBe("app-001");
      expect(insertedDevices[0]?.applicationName).toBe("Farm Monitoring");

      expect(insertedDevices[1]?.devEui).toBe("FEDCBA0987654321");
      expect(insertedDevices[1]?.name).toBe("気象センサー1");
      expect(insertedDevices[1]?.applicationId).toBe("app-002");
      expect(insertedDevices[1]?.applicationName).toBe("Weather Station");
    });

    it("既存のデバイス情報を更新できる（upsert）", async () => {
      // Arrange
      const originalDevice: DeviceInfoInput = {
        devEui: "1111111111111111",
        name: "古い名前",
        applicationId: "old-app",
        applicationName: "Old App",
      };

      const updatedDevice: DeviceInfoInput = {
        devEui: "1111111111111111", // 同じdevEui
        name: "新しい名前",
        applicationId: "new-app",
        applicationName: "New App",
      };

      // Act
      await repo.bulkUpsertDeviceInfo([originalDevice]);
      await repo.bulkUpsertDeviceInfo([updatedDevice]); // 更新

      // Assert
      const device = await db
        .select()
        .from(devicesInfoTable)
        .where(eq(devicesInfoTable.devEui, "1111111111111111"));

      expect(device).toHaveLength(1);
      expect(device[0]?.name).toBe("新しい名前"); // 更新された
      expect(device[0]?.applicationId).toBe("new-app"); // 更新された
      expect(device[0]?.applicationName).toBe("New App"); // 更新された
    });

    it("オプションフィールドがnullでも処理される", async () => {
      // Arrange
      const deviceInfoArray: DeviceInfoInput[] = [
        {
          devEui: "AAAAAAAAAAAAAAAA",
          name: "シンプルセンサー",
          // applicationIdとapplicationNameは省略
        },
      ];

      // Act
      await repo.bulkUpsertDeviceInfo(deviceInfoArray);

      // Assert
      const device = await db
        .select()
        .from(devicesInfoTable)
        .where(eq(devicesInfoTable.devEui, "AAAAAAAAAAAAAAAA"));

      expect(device).toHaveLength(1);
      expect(device[0]?.name).toBe("シンプルセンサー");
      expect(device[0]?.applicationId).toBeNull();
      expect(device[0]?.applicationName).toBeNull();
    });

    it("空の配列で呼び出してもエラーにならない", async () => {
      // Arrange
      const deviceInfoArray: DeviceInfoInput[] = [];

      // Act & Assert
      await expect(repo.bulkUpsertDeviceInfo(deviceInfoArray)).resolves.not.toThrow();

      // データベースにレコードが挿入されていないことを確認
      const count = await db.select().from(devicesInfoTable);
      expect(count).toHaveLength(0);
    });

    it("部分的な更新が正しく動作する", async () => {
      // Arrange
      const originalDevice: DeviceInfoInput = {
        devEui: "2222222222222222",
        name: "元の名前",
        applicationId: "original-app",
        applicationName: "Original App",
      };

      const partialUpdate: DeviceInfoInput = {
        devEui: "2222222222222222",
        name: "更新された名前",
        // applicationIdとapplicationNameは省略（nullに更新される）
      };

      // Act
      await repo.bulkUpsertDeviceInfo([originalDevice]);
      await repo.bulkUpsertDeviceInfo([partialUpdate]);

      // Assert
      const device = await db
        .select()
        .from(devicesInfoTable)
        .where(eq(devicesInfoTable.devEui, "2222222222222222"));

      expect(device).toHaveLength(1);
      expect(device[0]?.name).toBe("更新された名前");
      expect(device[0]?.applicationId).toBeNull(); // nullに更新された
      expect(device[0]?.applicationName).toBeNull(); // nullに更新された
    });

    it("複数のデバイス情報を一括処理できる", async () => {
      // Arrange
      const deviceInfoArray: DeviceInfoInput[] = [
        {
          devEui: "DEV1111111111111",
          name: "デバイス1",
          applicationId: "app-1",
          applicationName: "Application 1",
        },
        {
          devEui: "DEV2222222222222",
          name: "デバイス2",
          applicationId: "app-2",
          applicationName: "Application 2",
        },
        {
          devEui: "DEV3333333333333",
          name: "デバイス3",
        },
      ];

      // Act
      await repo.bulkUpsertDeviceInfo(deviceInfoArray);

      // Assert
      const devices = await db
        .select()
        .from(devicesInfoTable)
        .orderBy(devicesInfoTable.devEui);

      expect(devices).toHaveLength(3);
      expect(devices.map((d) => d.devEui)).toEqual([
        "DEV1111111111111",
        "DEV2222222222222",
        "DEV3333333333333",
      ]);
      expect(devices.map((d) => d.name)).toEqual([
        "デバイス1",
        "デバイス2",
        "デバイス3",
      ]);
    });
  });
});
