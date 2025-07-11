import { createSensorDBClient } from "@repo/sensor-db";

export const getSensorDB = (e: Env) => {
  return createSensorDBClient({
    type: "d1",
    params: {
      d1: e.SensorDB,
    },
  });
};
