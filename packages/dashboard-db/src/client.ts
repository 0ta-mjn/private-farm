import { DashboardD1DB, DashboardD1DBParams } from "./adapters/d1/client";
import { DashboardDBError } from "./errors";

export type DashboardDBParams = {
  type: "d1";
  params: DashboardD1DBParams;
};

export const createDashboardDBClient = (config: DashboardDBParams) => {
  switch (config.type) {
    case "d1":
      return DashboardD1DB(config.params);
    default:
      throw new DashboardDBError(
        "internal_error",
        `Unsupported database type: ${config.type}`
      );
  }
};
