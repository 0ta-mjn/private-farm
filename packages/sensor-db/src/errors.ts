export type SensorDBErrorType = "internal_error" | "forbidden";

export class SensorDBError extends Error {
  code: SensorDBErrorType;
  constructor(code: SensorDBErrorType, message?: string) {
    super(message);
    this.code = code;
    this.name = "SensorDBError";
  }
}
