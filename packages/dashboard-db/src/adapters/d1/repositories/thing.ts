import {
  ThingRepository,
  CreateThingInput,
  UpdateThingInput,
  ThingParams,
} from "../../../interfaces/thing";
import { thingsTable } from "../schema";
import { withUniqueIdRetry } from "../utils"; // 既存 util を再利用
import { DEFAULT_UUID_CONFIG } from "@repo/config";
import { and, eq } from "drizzle-orm";
import { Database } from "../client";
import { DashboardDBError } from "../../../errors";

export class D1ThingRepo implements ThingRepository {
  constructor(private db: Database) {}

  async create(input: CreateThingInput) {
    const rows = await withUniqueIdRetry(
      (id) =>
        this.db
          .insert(thingsTable)
          .values({ id, ...input })
          .returning(),
      { idPrefix: DEFAULT_UUID_CONFIG.thing.idPrefix }
    );
    const result = rows[0];
    if (!result)
      throw new DashboardDBError("internal_error", "Failed to create thing");
    return result;
  }

  async findById({ organizationId, thingId }: ThingParams) {
    const result = await this.db
      .select()
      .from(thingsTable)
      .where(
        and(
          eq(thingsTable.id, thingId),
          eq(thingsTable.organizationId, organizationId)
        )
      )
      .get();
    return result || null;
  }

  async listByOrganizationId(organizationId: string) {
    return this.db
      .select()
      .from(thingsTable)
      .where(eq(thingsTable.organizationId, organizationId))
      .orderBy(thingsTable.createdAt)
      .all();
  }

  async update(
    { organizationId, thingId }: ThingParams,
    patch: UpdateThingInput
  ) {
    const rows = await this.db
      .update(thingsTable)
      .set({ ...patch, updatedAt: new Date() })
      .where(
        and(
          eq(thingsTable.id, thingId),
          eq(thingsTable.organizationId, organizationId)
        )
      )
      .returning();
    const result = rows[0];
    if (!result) {
      throw new DashboardDBError(
        "not_found",
        `Thing with id ${thingId} not found in organization ${organizationId}`
      );
    }
    return result;
  }

  async delete({ organizationId, thingId }: ThingParams) {
    const rows = await this.db
      .delete(thingsTable)
      .where(
        and(
          eq(thingsTable.id, thingId),
          eq(thingsTable.organizationId, organizationId)
        )
      )
      .returning();
    return rows.length > 0;
  }
}
