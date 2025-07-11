import { describe, it, expect, vi, beforeEach } from "vitest";
import { bulkInsertSensorData } from "./handler";
import { SensorDB } from "@repo/sensor-db";
import { EnQueuedMessage } from "../interfaces";

// DBのモック
const mockBulkInsert = vi.fn();
const mockBulkUpsertDeviceInfo = vi.fn();

const mockSensorDB: SensorDB = {
  ingest: {
    bulkInsert: mockBulkInsert,
    bulkUpsertDeviceInfo: mockBulkUpsertDeviceInfo,
  },
} as SensorDB;

describe("bulkInsertSensorData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("正常系", () => {
    it("有効なメッセージを正しく処理してDBに保存できること", async () => {
      const messages: EnQueuedMessage[] = [
        {
          event: "up",
          data: {
            deduplicationId: "test-dedup-1",
            time: "2025-07-11T10:00:00.000Z",
            deviceInfo: {
              devEui: "1234567890abcdef",
              deviceName: "test-sensor-1",
              applicationId: "app-1",
              applicationName: "Test App",
            },
            object: {
              parsed: {
                "soil-moisture": 45.2,
                "soil-temperature": 23.5,
              },
            },
          },
        },
        {
          event: "up",
          data: {
            deduplicationId: "test-dedup-2",
            time: "2025-07-11T11:00:00.000Z",
            deviceInfo: {
              devEui: "abcdef1234567890",
              deviceName: "test-sensor-2",
            },
            object: {
              parsed: {
                "air-temperature": 25.8,
                humidity: 67.5,
              },
            },
          },
        },
      ];

      await bulkInsertSensorData(mockSensorDB, messages);

      // センサーデータの一括挿入が呼ばれることを確認
      expect(mockBulkInsert).toHaveBeenCalledTimes(1);
      expect(mockBulkInsert).toHaveBeenCalledWith([
        {
          deduplicationId: "test-dedup-1",
          time: new Date("2025-07-11T10:00:00.000Z"),
          devEui: "1234567890abcdef",
          type: "soil-moisture",
          value: 45.2,
        },
        {
          deduplicationId: "test-dedup-1",
          time: new Date("2025-07-11T10:00:00.000Z"),
          devEui: "1234567890abcdef",
          type: "soil-temperature",
          value: 23.5,
        },
        {
          deduplicationId: "test-dedup-2",
          time: new Date("2025-07-11T11:00:00.000Z"),
          devEui: "abcdef1234567890",
          type: "air-temperature",
          value: 25.8,
        },
        {
          deduplicationId: "test-dedup-2",
          time: new Date("2025-07-11T11:00:00.000Z"),
          devEui: "abcdef1234567890",
          type: "humidity",
          value: 67.5,
        },
      ]);

      // デバイス情報の一括アップサートが呼ばれることを確認
      expect(mockBulkUpsertDeviceInfo).toHaveBeenCalledTimes(1);
      expect(mockBulkUpsertDeviceInfo).toHaveBeenCalledWith([
        {
          devEui: "abcdef1234567890",
          name: "test-sensor-2",
          applicationId: undefined,
          applicationName: undefined,
        },
        {
          devEui: "1234567890abcdef",
          name: "test-sensor-1",
          applicationId: "app-1",
          applicationName: "Test App",
        },
      ]);
    });

    it("batteryLevelが含まれるメッセージを正しく処理できること", async () => {
      const messages: EnQueuedMessage[] = [
        {
          event: "up",
          data: {
            deduplicationId: "test-dedup-battery",
            time: "2025-07-11T12:00:00.000Z",
            deviceInfo: {
              devEui: "fedcba0987654321",
              deviceName: "battery-sensor",
            },
            object: {
              parsed: {
                "soil-moisture": 40.0,
              },
            },
            batteryLevel: 85,
          },
        },
      ];

      await bulkInsertSensorData(mockSensorDB, messages);

      expect(mockBulkInsert).toHaveBeenCalledWith([
        {
          deduplicationId: "test-dedup-battery",
          time: new Date("2025-07-11T12:00:00.000Z"),
          devEui: "fedcba0987654321",
          type: "soil-moisture",
          value: 40.0,
        },
        {
          deduplicationId: "test-dedup-battery",
          time: new Date("2025-07-11T12:00:00.000Z"),
          devEui: "fedcba0987654321",
          type: "battery-percentage",
          value: 85,
        },
      ]);
    });

    it("同じdevEuiの複数メッセージで最新のデバイス情報のみが保存されること", async () => {
      const messages: EnQueuedMessage[] = [
        {
          event: "up",
          data: {
            deduplicationId: "test-dedup-old",
            time: "2025-07-11T10:00:00.000Z", // 古い時刻
            deviceInfo: {
              devEui: "1234567890abcdef",
              deviceName: "old-sensor-name",
              applicationId: "old-app",
              applicationName: "Old App",
            },
            object: {
              parsed: {
                "soil-moisture": 30.0,
              },
            },
          },
        },
        {
          event: "up",
          data: {
            deduplicationId: "test-dedup-new",
            time: "2025-07-11T12:00:00.000Z", // 新しい時刻
            deviceInfo: {
              devEui: "1234567890abcdef",
              deviceName: "new-sensor-name",
              applicationId: "new-app",
              applicationName: "New App",
            },
            object: {
              parsed: {
                "soil-temperature": 25.0,
              },
            },
          },
        },
      ];

      await bulkInsertSensorData(mockSensorDB, messages);

      // 最新のデバイス情報のみが保存されることを確認
      expect(mockBulkUpsertDeviceInfo).toHaveBeenCalledWith([
        {
          devEui: "1234567890abcdef",
          name: "new-sensor-name", // 新しい名前
          applicationId: "new-app",
          applicationName: "New App",
        },
      ]);
    });
  });

  describe("エッジケース", () => {
    it("空のメッセージ配列でも正常に処理できること", async () => {
      const messages: EnQueuedMessage[] = [];

      await bulkInsertSensorData(mockSensorDB, messages);

      expect(mockBulkInsert).toHaveBeenCalledWith([]);
      expect(mockBulkUpsertDeviceInfo).toHaveBeenCalledWith([]);
    });

    it("無効なメッセージが含まれていても正常に処理できること", async () => {
      const messages: EnQueuedMessage[] = [
        {
          event: "up",
          data: {
            invalidField: "invalid",
          },
        },
        {
          event: "up",
          data: {
            deduplicationId: "test-dedup-valid",
            time: "2025-07-11T14:00:00.000Z",
            deviceInfo: {
              devEui: "validdeviceeui123",
              deviceName: "valid-sensor",
            },
            object: {
              parsed: {
                "air-temperature": 22.0,
              },
            },
          },
        },
      ];

      await bulkInsertSensorData(mockSensorDB, messages);

      // 有効なメッセージのみが処理されることを確認
      expect(mockBulkInsert).toHaveBeenCalledWith([
        {
          deduplicationId: "test-dedup-valid",
          time: new Date("2025-07-11T14:00:00.000Z"),
          devEui: "validdeviceeui123",
          type: "air-temperature",
          value: 22.0,
        },
      ]);

      expect(mockBulkUpsertDeviceInfo).toHaveBeenCalledWith([
        {
          devEui: "validdeviceeui123",
          name: "valid-sensor",
          applicationId: undefined,
          applicationName: undefined,
        },
      ]);
    });

    it("valuesがnullまたは空のメッセージがあっても正常に処理できること", async () => {
      const messages: EnQueuedMessage[] = [
        {
          event: "up",
          data: {
            deduplicationId: "test-dedup-no-values",
            time: "2025-07-11T15:00:00.000Z",
            deviceInfo: {
              devEui: "novaluesdevice123",
              deviceName: "no-values-sensor",
            },
            // objectなし（valuesはnullになる）
          },
        },
        {
          event: "up",
          data: {
            deduplicationId: "test-dedup-with-values",
            time: "2025-07-11T16:00:00.000Z",
            deviceInfo: {
              devEui: "withvaluesdevice456",
              deviceName: "with-values-sensor",
            },
            object: {
              parsed: {
                humidity: 65.0,
              },
            },
          },
        },
      ];

      await bulkInsertSensorData(mockSensorDB, messages);

      // valuesがあるメッセージのみがセンサーデータとして保存されることを確認
      expect(mockBulkInsert).toHaveBeenCalledWith([
        {
          deduplicationId: "test-dedup-with-values",
          time: new Date("2025-07-11T16:00:00.000Z"),
          devEui: "withvaluesdevice456",
          type: "humidity",
          value: 65.0,
        },
      ]);

      // 両方のデバイス情報は保存されることを確認
      expect(mockBulkUpsertDeviceInfo).toHaveBeenCalledWith([
        {
          devEui: "withvaluesdevice456",
          name: "with-values-sensor",
          applicationId: undefined,
          applicationName: undefined,
        },
        {
          devEui: "novaluesdevice123",
          name: "no-values-sensor",
          applicationId: undefined,
          applicationName: undefined,
        },
      ]);
    });

    it("deviceNameが空文字列の場合も正常に処理できること", async () => {
      const messages: EnQueuedMessage[] = [
        {
          event: "up",
          data: {
            deduplicationId: "test-dedup-empty-name",
            time: "2025-07-11T17:00:00.000Z",
            deviceInfo: {
              devEui: "emptyname12345678",
              deviceName: "",
            },
            object: {
              parsed: {
                "soil-ec": 1.2,
              },
            },
          },
        },
      ];

      await bulkInsertSensorData(mockSensorDB, messages);

      expect(mockBulkUpsertDeviceInfo).toHaveBeenCalledWith([
        {
          devEui: "emptyname12345678",
          name: "",
          applicationId: undefined,
          applicationName: undefined,
        },
      ]);
    });

    it("複数の異なるイベントタイプが混在していても正常に処理できること", async () => {
      const messages: EnQueuedMessage[] = [
        {
          event: "up",
          data: {
            deduplicationId: "test-dedup-up",
            time: "2025-07-11T18:00:00.000Z",
            deviceInfo: {
              devEui: "upevent1234567890",
              deviceName: "up-event-sensor",
            },
            object: {
              parsed: {
                "air-temperature": 20.0,
              },
            },
          },
        },
        {
          event: "join",
          data: {
            deduplicationId: "test-dedup-join",
            time: "2025-07-11T18:30:00.000Z",
            deviceInfo: {
              devEui: "joinevent123456789",
              deviceName: "join-event-sensor",
            },
            object: {
              parsed: {
                "battery-percentage": 95,
              },
            },
          },
        },
        {
          event: "status",
          data: {
            deduplicationId: "test-dedup-status",
            time: "2025-07-11T19:00:00.000Z",
            deviceInfo: {
              devEui: "statusevent1234567",
              deviceName: "status-event-sensor",
            },
            // objectなし
          },
        },
      ];

      await bulkInsertSensorData(mockSensorDB, messages);

      expect(mockBulkInsert).toHaveBeenCalledWith([
        {
          deduplicationId: "test-dedup-up",
          time: new Date("2025-07-11T18:00:00.000Z"),
          devEui: "upevent1234567890",
          type: "air-temperature",
          value: 20.0,
        },
        {
          deduplicationId: "test-dedup-join",
          time: new Date("2025-07-11T18:30:00.000Z"),
          devEui: "joinevent123456789",
          type: "battery-percentage",
          value: 95,
        },
      ]);

      expect(mockBulkUpsertDeviceInfo).toHaveBeenCalledWith([
        {
          devEui: "statusevent1234567",
          name: "status-event-sensor",
          applicationId: undefined,
          applicationName: undefined,
        },
        {
          devEui: "joinevent123456789",
          name: "join-event-sensor",
          applicationId: undefined,
          applicationName: undefined,
        },
        {
          devEui: "upevent1234567890",
          name: "up-event-sensor",
          applicationId: undefined,
          applicationName: undefined,
        },
      ]);
    });
  });

  describe("異常系", () => {
    it("DBのbulkInsertでエラーが発生した場合は例外をスローすること", async () => {
      const mockError = new Error("Database insert failed");
      mockBulkInsert.mockRejectedValueOnce(mockError);

      const messages: EnQueuedMessage[] = [
        {
          event: "up",
          data: {
            deduplicationId: "test-dedup-error",
            time: "2025-07-11T20:00:00.000Z",
            deviceInfo: {
              devEui: "errordevice123456",
              deviceName: "error-sensor",
            },
            object: {
              parsed: {
                "soil-moisture": 35.0,
              },
            },
          },
        },
      ];

      await expect(bulkInsertSensorData(mockSensorDB, messages)).rejects.toThrow(
        "Database insert failed"
      );
    });

    it("DBのbulkUpsertDeviceInfoでエラーが発生した場合は例外をスローすること", async () => {
      const mockError = new Error("Device info upsert failed");
      mockBulkUpsertDeviceInfo.mockRejectedValueOnce(mockError);

      const messages: EnQueuedMessage[] = [
        {
          event: "up",
          data: {
            deduplicationId: "test-dedup-device-error",
            time: "2025-07-11T21:00:00.000Z",
            deviceInfo: {
              devEui: "deviceerror123456",
              deviceName: "device-error-sensor",
            },
            object: {
              parsed: {
                humidity: 70.0,
              },
            },
          },
        },
      ];

      await expect(bulkInsertSensorData(mockSensorDB, messages)).rejects.toThrow(
        "Device info upsert failed"
      );
    });
  });
});
