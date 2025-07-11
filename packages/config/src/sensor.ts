import { z } from "zod";

export const SupportedSensorProperty = z.enum([
  "soil-moisture", // 体積含水率
  "soil-temperature", // 土壌温度
  "soil-ec", // 土壌EC (電気伝導度)
  "air-temperature", // 気温
  "humidity", // 湿度
  "precipitation", // 降水量
  "wind-speed", // 風速
  "solar-radiation", // 日射量
  "battery-percentage", // バッテリー残量 (パーセンテージ)
]);
export type SupportedSensorProperty = z.infer<typeof SupportedSensorProperty>;