import { DashboardDBError } from "@repo/dashboard-db";
import { HTTPException } from "hono/http-exception";

export const getHttpExceptionFromDashboardDBError = (error: DashboardDBError) => {
  switch (error.code) {
    case "forbidden":
      return new HTTPException(403, { message: error.message });
    case "not_found":
      return new HTTPException(404, { message: error.message });
    case "conflict":
      return new HTTPException(409, { message: error.message });
    case "invalid_input":
      return new HTTPException(400, { message: error.message });
    default:
      return new HTTPException(500, { message: error.message });
  }
};
