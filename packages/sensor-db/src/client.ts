import { SensorD1DB, SensorD1DBParams } from "./adapters/d1/client";
import { SensorDBError } from "./errors";

export type SensorDBParams = {
  type: "d1";
  params: SensorD1DBParams;
};

export const createSensorDBClient = (config: SensorDBParams) => {
  switch (config.type) {
    case "d1":
      return SensorD1DB(config.params);
    default:
      throw new SensorDBError(
        "internal_error",
        `Unsupported database type: ${config.type}`
      );
  }
};
