export type DashboardDBErrorType =
  | "not_found"
  | "invalid_input"
  | "conflict"
  | "internal_error"
  | "forbidden";

export class DashboardDBError extends Error {
  code: DashboardDBErrorType;
  constructor(code: DashboardDBErrorType, message?: string) {
    super(message);
    this.code = code;
    this.name = "DashboardDBError";
  }
}
