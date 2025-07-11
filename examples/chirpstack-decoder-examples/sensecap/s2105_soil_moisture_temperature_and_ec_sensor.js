/**
 * @see https://files.seeedstudio.com/products/SenseCAP/S210X
 * @see https://github.com/TheThingsNetwork/lorawan-devices
 */

// Constant definitions
const ERROR_CODES = {
  CRC_CHECK_FAIL: -1,
  LENGTH_CHECK_FAIL: -2,
};

const DATA_IDS = {
  NODE_VERSION: 0x00,
  SENSOR_VERSION: 1,
  SENSOR_EUI_LOW: 2,
  SENSOR_EUI_HIGH: 3,
  BATTERY_INTERVAL: 7,
  REMOVE_SENSOR: 0x120,
  SOIL_TEMPERATURE: 0x1006,
  SOIL_MOISTURE: 0x1007,
  SOIL_EC: 0x100c,
};

const FRAME_SIZE = 7; // Number of bytes

/**
 * Entry point - LoRaWAN uplink decoder
 */
function decodeUplink(input) {
  const bytes = input["bytes"];
  const hexString = convertBytesToHex(bytes).toUpperCase();

  const result = createInitialResult(hexString);

  // Validation
  if (!validatePayload(hexString, result)) {
    return { data: result };
  }

  // Frame processing
  const frames = splitIntoFrames(hexString);
  const sensorEui = processSensorFrames(frames, result);

  // When sensor ID is complete
  if (sensorEui.isComplete()) {
    result.messages.unshift(sensorEui.createMessage());
  }

  // Build parsed data
  result.parsed = buildParsedData(result.messages);

  return { data: result };
}

/**
 * Create initial result object
 */
function createInitialResult(hexString) {
  return {
    valid: true,
    err: 0,
    payload: hexString,
    messages: [],
    parsed: {},
  };
}

/**
 * Payload validation
 */
function validatePayload(hexString, result) {
  if (!validateCrc(hexString)) {
    result.valid = false;
    result.err = ERROR_CODES.CRC_CHECK_FAIL;
    return false;
  }

  if (!validateLength(hexString)) {
    result.valid = false;
    result.err = ERROR_CODES.LENGTH_CHECK_FAIL;
    return false;
  }

  return true;
}

/**
 * CRC check
 */
function validateCrc(hexString) {
  // TODO: Implement actual CRC validation logic
  return true;
}

/**
 * Length check
 */
function validateLength(hexString) {
  const dataLength = hexString.length / 2 - 2; // Exclude CRC
  return dataLength % FRAME_SIZE === 0;
}

/**
 * Split into frames
 */
function splitIntoFrames(hexString) {
  const frames = [];
  const frameByteSize = FRAME_SIZE * 2; // Length in hex string

  for (let i = 0; i < hexString.length - 4; i += frameByteSize) {
    frames.push(hexString.substring(i, i + frameByteSize));
  }

  return frames;
}

/**
 * Process sensor frames
 */
function processSensorFrames(frames, result) {
  const sensorEui = new SensorEuiBuilder();

  frames.forEach((frame) => {
    const frameData = parseFrame(frame);
    const message = createMessage(frameData, sensorEui);

    if (message) {
      if (Array.isArray(message)) {
        result.messages.push(...message);
      } else {
        result.messages.push(message);
      }
    }
  });

  return sensorEui;
}

/**
 * Parse frame data
 */
function parseFrame(frame) {
  return {
    channel: convertToDecimal(frame.substring(0, 2)),
    dataId: convertToDecimal(frame.substring(2, 6)),
    dataValue: frame.substring(6, 14),
  };
}

/**
 * Create message
 */
function createMessage(frameData, sensorEui) {
  const { dataId, dataValue } = frameData;
  const processedValue = processDataValue(dataId, dataValue);

  if (isTelemetryData(dataId)) {
    return createTelemetryMessage(dataId, processedValue);
  }

  if (isSpecialData(dataId)) {
    return createSpecialMessage(dataId, processedValue, sensorEui);
  }

  return createUnknownMessage(dataId, dataValue);
}

/**
 * Check if telemetry data
 */
function isTelemetryData(dataId) {
  return dataId > 4096;
}

/**
 * Check if special data
 */
function isSpecialData(dataId) {
  const specialIds = [0, 1, 2, 3, 4, 7, DATA_IDS.REMOVE_SENSOR];
  return specialIds.includes(dataId);
}

/**
 * Process data value
 */
function processDataValue(dataId, dataValue) {
  return isSpecialData(dataId)
    ? processSpecialData(dataId, dataValue)
    : processStandardData(dataValue);
}

/**
 * Process special data
 */
function processSpecialData(dataId, dataValue) {
  const reversedBytes = reverseByteOrder(dataValue);

  switch (dataId) {
    case DATA_IDS.SENSOR_EUI_LOW:
    case DATA_IDS.SENSOR_EUI_HIGH:
      return reversedBytes.join("");

    case DATA_IDS.NODE_VERSION:
    case DATA_IDS.SENSOR_VERSION:
      return formatVersionData(reversedBytes);

    case DATA_IDS.BATTERY_INTERVAL:
      return formatBatteryInterval(reversedBytes);

    default:
      return convertToBinary(reversedBytes);
  }
}

/**
 * Process standard data
 */
function processStandardData(dataValue) {
  const reversedBytes = reverseByteOrder(dataValue);
  const binaryString = convertToBinary(reversedBytes);

  if (binaryString.startsWith("1")) {
    // Handle negative numbers (two's complement)
    const inverted = invertBits(binaryString);
    const value = parseInt(inverted, 2) + 1;
    return -value / 1000;
  }

  return parseInt(binaryString, 2) / 1000;
}

/**
 * Create telemetry message
 */
function createTelemetryMessage(dataId, value) {
  return {
    type: "report_telemetry",
    measurementId: dataId,
    measurementValue: value,
  };
}

/**
 * Create special message
 */
function createSpecialMessage(dataId, value, sensorEui) {
  switch (dataId) {
    case DATA_IDS.NODE_VERSION:
      return createVersionMessage(value);

    case DATA_IDS.SENSOR_EUI_LOW:
      sensorEui.setLowBytes(value);
      return null;

    case DATA_IDS.SENSOR_EUI_HIGH:
      sensorEui.setHighBytes(value);
      return null;

    case DATA_IDS.BATTERY_INTERVAL:
      return createBatteryIntervalMessages(value);

    case DATA_IDS.REMOVE_SENSOR:
      return createRemoveSensorMessage();

    default:
      return null;
  }
}

/**
 * Create unknown message
 */
function createUnknownMessage(dataId, dataValue) {
  return {
    type: "unknown_message",
    dataID: dataId,
    dataValue: dataValue,
  };
}

/**
 * Create version message
 */
function createVersionMessage(versionString) {
  const versions = parseVersionString(versionString);
  return {
    type: "upload_version",
    hardwareVersion: versions.hardware,
    softwareVersion: versions.software,
  };
}

/**
 * Create battery/interval messages
 */
function createBatteryIntervalMessages(data) {
  return [
    {
      type: "upload_battery",
      battery: data.power,
    },
    {
      type: "upload_interval",
      interval: data.interval * 60,
    },
  ];
}

/**
 * Create remove sensor message
 */
function createRemoveSensorMessage() {
  return {
    type: "report_remove_sensor",
    channel: 1,
  };
}

/**
 * Build parsed data
 */
function buildParsedData(messages) {
  return messages.reduce((acc, message) => {
    switch (message.type) {
      case "upload_battery":
        acc["battery-percentage"] = message.battery;
        break;

      case "report_telemetry":
        mapTelemetryData(acc, message);
        break;
    }
    return acc;
  }, {});
}

/**
 * Map telemetry data
 */
function mapTelemetryData(acc, message) {
  const mapping = {
    [DATA_IDS.SOIL_TEMPERATURE]: "soil-temperature",
    [DATA_IDS.SOIL_MOISTURE]: "soil-moisture",
    [DATA_IDS.SOIL_EC]: "soil-ec",
  };

  const key = mapping[message.measurementId];
  if (key) {
    acc[key] = message.measurementValue;
  }
}

/**
 * Sensor EUI builder class
 */
class SensorEuiBuilder {
  constructor() {
    this.highBytes = null;
    this.lowBytes = null;
  }

  setHighBytes(bytes) {
    this.highBytes = bytes;
  }

  setLowBytes(bytes) {
    this.lowBytes = bytes;
  }

  isComplete() {
    return this.highBytes && this.lowBytes;
  }

  createMessage() {
    return {
      type: "upload_sensor_id",
      channel: 1,
      sensorId: (this.highBytes + this.lowBytes).toUpperCase(),
    };
  }
}

// Utility functions

/**
 * Convert byte array to hex string
 */
function convertBytesToHex(bytes) {
  return bytes
    .map((byte) => {
      const hex = (byte < 0 ? 255 + byte + 1 : byte).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    })
    .join("");
}

/**
 * Reverse byte order
 */
function reverseByteOrder(hexString) {
  const bytes = [];
  for (let i = 0; i < hexString.length; i += 2) {
    bytes.push(hexString.substring(i, i + 2));
  }
  return bytes.reverse();
}

/**
 * Convert hex string to decimal
 */
function convertToDecimal(hexString) {
  const reversedBytes = reverseByteOrder(hexString);
  return parseInt(reversedBytes.join(""), 16);
}

/**
 * Convert byte array to binary string
 */
function convertToBinary(byteArray) {
  return byteArray
    .map((byte) => {
      const binary = parseInt(byte, 16).toString(2);
      return binary.padStart(8, "0");
    })
    .join("");
}

/**
 * Invert bits
 */
function invertBits(binaryString) {
  return binaryString
    .split("")
    .map((bit) => (bit === "1" ? "0" : "1"))
    .join("");
}

/**
 * Parse version string
 */
function parseVersionString(versionString) {
  const [hardware, software] = versionString.split(",");
  return { hardware, software };
}

/**
 * Format version data
 */
function formatVersionData(byteArray) {
  const binaryString = convertToBinary(byteArray);
  const versions = [];

  for (let i = 0; i < binaryString.length; i += 16) {
    const chunk = binaryString.substring(i, i + 16);
    const major = parseInt(chunk.substring(0, 8), 2) || 0;
    const minor = parseInt(chunk.substring(8, 16), 2) || 0;
    versions.push(`${major}.${minor}`);
  }

  return versions.join(",");
}

/**
 * Format battery/interval data
 */
function formatBatteryInterval(byteArray) {
  const binaryString = convertToBinary(byteArray);
  return {
    interval: parseInt(binaryString.substring(0, 16), 2),
    power: parseInt(binaryString.substring(16, 32), 2),
  };
}
