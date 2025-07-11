import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseMessage } from "./chirpstack";

// console.warn と console.info をモック
const consoleMocks = {
  warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
  info: vi.spyOn(console, "info").mockImplementation(() => {}),
};

describe("parseMessage", () => {
  beforeEach(() => {
    consoleMocks.warn.mockClear();
    consoleMocks.info.mockClear();
  });

  describe("正常系", () => {
    it("有効なChirpStackメッセージを正しくパースできること", () => {
      const validMessage = {
        deduplicationId: "test-dedup-123",
        time: "2025-07-11T10:00:00.000Z",
        deviceInfo: {
          devEui: "1234567890abcdef",
          deviceName: "test-sensor",
          applicationId: "app-1",
          applicationName: "Test App",
        },
        object: {
          parsed: {
            "soil-moisture": 45.2,
            "soil-temperature": 23.5,
            "soil-ec": 1.2,
          },
        },
      };

      const result = parseMessage(validMessage);

      expect(result).toEqual({
        deduplicationId: "test-dedup-123",
        time: new Date("2025-07-11T10:00:00.000Z"),
        deviceInfo: {
          devEui: "1234567890abcdef",
          deviceName: "test-sensor",
          applicationId: "app-1",
          applicationName: "Test App",
        },
        values: [
          ["soil-moisture", 45.2],
          ["soil-temperature", 23.5],
          ["soil-ec", 1.2],
        ],
      });
    });

    it("文字列の数値を正しく変換できること", () => {
      const messageWithStringValues = {
        deduplicationId: "test-dedup-456",
        time: "2025-07-11T12:00:00.000Z",
        deviceInfo: {
          devEui: "abcdef1234567890",
          deviceName: "string-sensor",
        },
        object: {
          parsed: {
            "air-temperature": "25.8",
            humidity: "67.5",
            "battery-percentage": "85",
          },
        },
      };

      const result = parseMessage(messageWithStringValues);

      expect(result).toBeDefined();
      expect(result?.values).toContainEqual(["air-temperature", 25.8]);
      expect(result?.values).toContainEqual(["humidity", 67.5]);
      expect(result?.values).toContainEqual(["battery-percentage", 85]);
    });

    it("サポートされていないプロパティを無視すること", () => {
      const messageWithUnsupportedProps = {
        deduplicationId: "test-dedup-789",
        time: "2025-07-11T14:00:00.000Z",
        deviceInfo: {
          devEui: "fedcba0987654321",
          deviceName: "mixed-sensor",
        },
        object: {
          parsed: {
            "soil-moisture": 35.0,
            "unsupported-prop": 999,
            "another-invalid": "test",
            "air-temperature": 22.1,
          },
        },
      };

      const result = parseMessage(messageWithUnsupportedProps);

      expect(result).toBeDefined();
      expect(result?.values).toHaveLength(2);
      expect(result?.values).toContainEqual(["soil-moisture", 35.0]);
      expect(result?.values).toContainEqual(["air-temperature", 22.1]);
    });

    it("parsedオブジェクトが空でも正常に処理できること", () => {
      const messageWithEmptyParsed = {
        deduplicationId: "test-dedup-empty",
        time: "2025-07-11T16:00:00.000Z",
        deviceInfo: {
          devEui: "1111222233334444",
          deviceName: "empty-sensor",
        },
        object: {
          parsed: {},
        },
      };

      const result = parseMessage(messageWithEmptyParsed);

      expect(result).toBeDefined();
      expect(result?.values).toBeNull(); // 空の場合はnullを返す
    });

    it("parsedオブジェクトが存在しなくても正常に処理できること", () => {
      const messageWithoutParsed = {
        deduplicationId: "test-dedup-no-parsed",
        time: "2025-07-11T18:00:00.000Z",
        deviceInfo: {
          devEui: "5555666677778888",
          deviceName: "no-parsed-sensor",
        },
        object: {},
      };

      const result = parseMessage(messageWithoutParsed);

      expect(result).toBeDefined();
      expect(result?.values).toBeNull(); // 空の場合はnullを返す
    });

    it("applicationIdとapplicationNameがオプショナルでも正常に処理できること", () => {
      const messageWithoutOptionalFields = {
        deduplicationId: "test-dedup-minimal",
        time: "2025-07-11T20:00:00.000Z",
        deviceInfo: {
          devEui: "9999aaaabbbbcccc",
          deviceName: "minimal-sensor",
        },
        object: {
          parsed: {
            "soil-moisture": 40.0,
          },
        },
      };

      const result = parseMessage(messageWithoutOptionalFields);

      expect(result).toBeDefined();
      expect(result?.deviceInfo.applicationId).toBeUndefined();
      expect(result?.deviceInfo.applicationName).toBeUndefined();
      expect(result?.values).toEqual([["soil-moisture", 40.0]]);
    });

    it("objectが存在しない場合、values: null を返すこと", () => {
      const messageWithoutObject = {
        deduplicationId: "test-dedup-no-object",
        time: "2025-07-11T21:00:00.000Z",
        deviceInfo: {
          devEui: "aaaabbbbccccdddd",
          deviceName: "no-object-sensor",
          applicationId: "app-1",
          applicationName: "Test App",
        },
        // object field is missing
      };

      const result = parseMessage(messageWithoutObject);

      expect(result).toBeDefined();
      expect(result?.deduplicationId).toBe("test-dedup-no-object");
      expect(result?.time).toEqual(new Date("2025-07-11T21:00:00.000Z"));
      expect(result?.deviceInfo).toEqual({
        devEui: "aaaabbbbccccdddd",
        deviceName: "no-object-sensor",
        applicationId: "app-1",
        applicationName: "Test App",
      });
      expect(result?.values).toBeNull();
    });

    it("objectがnullの場合、values: null を返すこと", () => {
      const messageWithNullObject = {
        deduplicationId: "test-dedup-null-object",
        time: "2025-07-11T22:00:00.000Z",
        deviceInfo: {
          devEui: "bbbbccccddddeeee",
          deviceName: "null-object-sensor",
        },
        object: null,
      };

      const result = parseMessage(messageWithNullObject);

      expect(result).toBeDefined();
      expect(result?.deduplicationId).toBe("test-dedup-null-object");
      expect(result?.time).toEqual(new Date("2025-07-11T22:00:00.000Z"));
      expect(result?.deviceInfo).toEqual({
        devEui: "bbbbccccddddeeee",
        deviceName: "null-object-sensor",
        applicationId: undefined,
        applicationName: undefined,
      });
      expect(result?.values).toBeNull();
    });

    it("batteryLevelフィールドを正しく処理できること (数値)", () => {
      const messageWithBatteryLevel = {
        deduplicationId: "test-dedup-battery",
        time: "2025-07-11T23:00:00.000Z",
        deviceInfo: {
          devEui: "ccccddddeeeeaaaa",
          deviceName: "battery-sensor",
        },
        object: {
          parsed: {
            "soil-moisture": 45.0,
          },
        },
        batteryLevel: 75,
      };

      const result = parseMessage(messageWithBatteryLevel);

      expect(result).toBeDefined();
      expect(result?.values).toEqual([
        ["soil-moisture", 45.0],
        ["battery-percentage", 75],
      ]);
    });

    it("batteryLevelフィールドを正しく処理できること (文字列)", () => {
      const messageWithStringBatteryLevel = {
        deduplicationId: "test-dedup-battery-string",
        time: "2025-07-11T23:30:00.000Z",
        deviceInfo: {
          devEui: "ddddeeeeffffaaaa",
          deviceName: "battery-string-sensor",
        },
        object: {
          parsed: {
            "air-temperature": 22.5,
          },
        },
        batteryLevel: "85",
      };

      const result = parseMessage(messageWithStringBatteryLevel);

      expect(result).toBeDefined();
      expect(result?.values).toEqual([
        ["air-temperature", 22.5],
        ["battery-percentage", 85],
      ]);
    });

    it("batteryLevelがparsedにも含まれている場合、batteryLevelで上書きされること", () => {
      const messageWithBothBatteryFields = {
        deduplicationId: "test-dedup-battery-override",
        time: "2025-07-12T00:00:00.000Z",
        deviceInfo: {
          devEui: "eeeeffffaaaabbbb",
          deviceName: "battery-override-sensor",
        },
        object: {
          parsed: {
            "battery-percentage": 60, // この値は上書きされる
            "soil-temperature": 25.0,
          },
        },
        batteryLevel: 80, // この値が使用される
      };

      const result = parseMessage(messageWithBothBatteryFields);

      expect(result).toBeDefined();
      const batteryValue = result?.values?.find(([type]) => type === "battery-percentage");
      expect(batteryValue).toEqual(["battery-percentage", 80]); // 上書きされた値
    });

    it("objectがない場合でもbatteryLevelは処理されること", () => {
      const messageWithOnlyBatteryLevel = {
        deduplicationId: "test-dedup-only-battery",
        time: "2025-07-12T01:00:00.000Z",
        deviceInfo: {
          devEui: "ffffaaaabbbbcccc",
          deviceName: "only-battery-sensor",
        },
        // object field is missing
        batteryLevel: 95,
      };

      const result = parseMessage(messageWithOnlyBatteryLevel);

      expect(result).toBeDefined();
      expect(result?.values).toEqual([["battery-percentage", 95]]);
    });

    it("objectもbatteryLevelもない場合、values: null を返すこと", () => {
      const messageWithoutValues = {
        deduplicationId: "test-dedup-no-values",
        time: "2025-07-12T01:30:00.000Z",
        deviceInfo: {
          devEui: "aaaabbbbccccdddd",
          deviceName: "no-values-sensor",
        },
        // object and batteryLevel fields are missing
      };

      const result = parseMessage(messageWithoutValues);

      expect(result).toBeDefined();
      expect(result?.values).toBeNull();
    });

    it("batteryLevelが無効な文字列の場合は無視されること", () => {
      const messageWithInvalidBatteryLevel = {
        deduplicationId: "test-dedup-invalid-battery",
        time: "2025-07-12T02:00:00.000Z",
        deviceInfo: {
          devEui: "aaaabbbbccccdddd",
          deviceName: "invalid-battery-sensor",
        },
        object: {
          parsed: {
            "soil-moisture": 40.0,
          },
        },
        batteryLevel: "invalid-battery-value",
      };

      const result = parseMessage(messageWithInvalidBatteryLevel);

      expect(result).toBeDefined();
      expect(result?.values).toEqual([["soil-moisture", 40.0]]);
      // battery-percentageは含まれない
      const batteryValue = result?.values?.find(([type]) => type === "battery-percentage");
      expect(batteryValue).toBeUndefined();
    });

    it("batteryLevelが0の場合も正しく処理されること", () => {
      const messageWithZeroBattery = {
        deduplicationId: "test-dedup-zero-battery",
        time: "2025-07-12T02:30:00.000Z",
        deviceInfo: {
          devEui: "bbbbccccddddeeee",
          deviceName: "zero-battery-sensor",
        },
        batteryLevel: 0,
      };

      const result = parseMessage(messageWithZeroBattery);

      expect(result).toBeDefined();
      expect(result?.values).toEqual([["battery-percentage", 0]]);
    });

    it("batteryLevelが負の値の場合も処理されること", () => {
      const messageWithNegativeBattery = {
        deduplicationId: "test-dedup-negative-battery",
        time: "2025-07-12T03:00:00.000Z",
        deviceInfo: {
          devEui: "ccccddddeeeeaaaa",
          deviceName: "negative-battery-sensor",
        },
        batteryLevel: -5,
      };

      const result = parseMessage(messageWithNegativeBattery);

      expect(result).toBeDefined();
      expect(result?.values).toEqual([["battery-percentage", -5]]);
    });
  });

  describe("異常系", () => {
    it("無効なメッセージ形式の場合はnullを返すこと", () => {
      const invalidMessage = {
        invalidField: "test",
      };

      const result = parseMessage(invalidMessage);

      expect(result).toBeNull();
      expect(consoleMocks.warn).toHaveBeenCalledWith(
        "Failed to parse message:",
        expect.any(Array)
      );
      expect(consoleMocks.info).toHaveBeenCalledWith(
        "Original message:",
        JSON.stringify(invalidMessage, null, 2)
      );
    });

    it("必須フィールドが欠けている場合はnullを返すこと", () => {
      const incompleteMessage = {
        deduplicationId: "test-dedup-incomplete",
        // time field is missing
        deviceInfo: {
          devEui: "ddddeeeeffffaaaa",
          deviceName: "incomplete-sensor",
        },
        object: {},
      };

      const result = parseMessage(incompleteMessage);

      expect(result).toBeNull();
      expect(consoleMocks.warn).toHaveBeenCalled();
    });

    it("null入力の場合はnullを返すこと", () => {
      const result = parseMessage(null);

      expect(result).toBeNull();
      expect(consoleMocks.warn).toHaveBeenCalled();
    });

    it("undefined入力の場合はnullを返すこと", () => {
      const result = parseMessage(undefined);

      expect(result).toBeNull();
      expect(consoleMocks.warn).toHaveBeenCalled();
    });

    it("不正な値の型を警告して無視すること", () => {
      const messageWithInvalidTypes = {
        deduplicationId: "test-dedup-invalid-types",
        time: "2025-07-11T22:00:00.000Z",
        deviceInfo: {
          devEui: "bbbbccccddddeeee",
          deviceName: "invalid-types-sensor",
        },
        object: {
          parsed: {
            "soil-moisture": true, // boolean value
            "air-temperature": { invalid: "object" }, // object value
            humidity: 55.5, // valid number
          },
        },
      };

      const result = parseMessage(messageWithInvalidTypes);

      expect(result).toBeDefined();
      expect(result?.values).toEqual([["humidity", 55.5]]);
      expect(consoleMocks.warn).toHaveBeenCalledWith(
        "Unsupported value type for soil-moisture:",
        true
      );
      expect(consoleMocks.warn).toHaveBeenCalledWith(
        "Unsupported value type for air-temperature:",
        { invalid: "object" }
      );
    });

    it("パースできない文字列値を警告して無視すること", () => {
      const messageWithInvalidStringValues = {
        deduplicationId: "test-dedup-invalid-strings",
        time: "2025-07-11T23:00:00.000Z",
        deviceInfo: {
          devEui: "ccccddddeeeeaaaa",
          deviceName: "invalid-strings-sensor",
        },
        object: {
          parsed: {
            "soil-moisture": "not-a-number",
            "air-temperature": "25.5", // valid string number
            humidity: "invalid-float",
          },
        },
      };

      const result = parseMessage(messageWithInvalidStringValues);

      expect(result).toBeDefined();
      expect(result?.values).toEqual([["air-temperature", 25.5]]);
      expect(consoleMocks.warn).toHaveBeenCalledWith(
        "Skipping string value for soil-moisture:",
        "not-a-number"
      );
      expect(consoleMocks.warn).toHaveBeenCalledWith(
        "Skipping string value for humidity:",
        "invalid-float"
      );
    });

    it("すべての値が無効な場合、values: null を返すこと", () => {
      const messageWithAllInvalidValues = {
        deduplicationId: "test-dedup-all-invalid",
        time: "2025-07-12T03:00:00.000Z",
        deviceInfo: {
          devEui: "bbbbccccddddeeee",
          deviceName: "all-invalid-sensor",
        },
        object: {
          parsed: {
            "soil-moisture": "not-a-number",
            "air-temperature": { invalid: "object" },
            humidity: true,
          },
        },
      };

      const result = parseMessage(messageWithAllInvalidValues);

      expect(result).toBeDefined();
      expect(result?.values).toBeNull(); // すべて無効な場合はnullを返す
    });
  });

  describe("エッジケース", () => {
    it("すべてのサポートされているセンサープロパティを処理できること", () => {
      const messageWithAllProps = {
        deduplicationId: "test-dedup-all-props",
        time: "2025-07-12T00:00:00.000Z",
        deviceInfo: {
          devEui: "ffffeeeeddddcccc",
          deviceName: "all-props-sensor",
        },
        object: {
          parsed: {
            "soil-moisture": 50.0,
            "soil-temperature": 20.0,
            "soil-ec": 1.5,
            "air-temperature": 25.0,
            humidity: 60.0,
            precipitation: 5.2,
            "wind-speed": 3.5,
            "solar-radiation": 800.0,
            "battery-percentage": 90.0,
          },
        },
      };

      const result = parseMessage(messageWithAllProps);

      expect(result).toBeDefined();
      expect(result?.values).toHaveLength(9);
      
      // 各プロパティがvaluesに含まれることを確認
      const valueMap = new Map(result?.values || []);
      expect(valueMap.get("soil-moisture")).toBe(50.0);
      expect(valueMap.get("soil-temperature")).toBe(20.0);
      expect(valueMap.get("soil-ec")).toBe(1.5);
      expect(valueMap.get("air-temperature")).toBe(25.0);
      expect(valueMap.get("humidity")).toBe(60.0);
      expect(valueMap.get("precipitation")).toBe(5.2);
      expect(valueMap.get("wind-speed")).toBe(3.5);
      expect(valueMap.get("solar-radiation")).toBe(800.0);
      expect(valueMap.get("battery-percentage")).toBe(90.0);
    });

    it("ゼロ値を正しく処理できること", () => {
      const messageWithZeroValues = {
        deduplicationId: "test-dedup-zero",
        time: "2025-07-12T01:00:00.000Z",
        deviceInfo: {
          devEui: "0000111122223333",
          deviceName: "zero-values-sensor",
        },
        object: {
          parsed: {
            "soil-moisture": 0,
            "air-temperature": 0.0,
            precipitation: "0",
          },
        },
      };

      const result = parseMessage(messageWithZeroValues);

      expect(result).toBeDefined();
      expect(result?.values).toEqual([
        ["soil-moisture", 0],
        ["air-temperature", 0.0],
        ["precipitation", 0],
      ]);
    });

    it("負の値を正しく処理できること", () => {
      const messageWithNegativeValues = {
        deduplicationId: "test-dedup-negative",
        time: "2025-07-12T02:00:00.000Z",
        deviceInfo: {
          devEui: "3333444455556666",
          deviceName: "negative-values-sensor",
        },
        object: {
          parsed: {
            "air-temperature": -10.5,
            "soil-temperature": "-5.2",
          },
        },
      };

      const result = parseMessage(messageWithNegativeValues);

      expect(result).toBeDefined();
      expect(result?.values).toEqual([
        ["air-temperature", -10.5],
        ["soil-temperature", -5.2],
      ]);
    });
  });
});
