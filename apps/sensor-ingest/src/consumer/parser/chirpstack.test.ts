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
      expect(result?.values).toEqual([]);
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
      expect(result?.values).toEqual([]);
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

    it("パースできない文字列値を無視すること", () => {
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
      // パースできない文字列値は単純に無視され、警告は出ない
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
