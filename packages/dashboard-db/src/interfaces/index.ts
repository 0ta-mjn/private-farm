import { DiaryRepository } from "./diary";
import { DiscordRepository } from "./discord";
import { OrganizationRepository } from "./organization";
import { ThingRepository } from "./thing";
import { UserRepository } from "./user";

export * from "./thing";
export * from "./organization";
export * from "./user";
export * from "./diary";
export * from "./discord";
export * from "./discord";

export interface DashboardDB {
  user: UserRepository;
  organization: OrganizationRepository;
  thing: ThingRepository;
  diary: DiaryRepository;
  discord: DiscordRepository;
}

export type { AnyD1Database } from "drizzle-orm/d1";
