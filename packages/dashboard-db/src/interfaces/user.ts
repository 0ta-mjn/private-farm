import { z } from "zod";
import {
  OrganizationMembership,
  type OrganizationWithRole,
} from "./organization";

/* === DTO === */
export const User = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type User = z.infer<typeof User>;

export const SetupInput = z.object({
  userName: z
    .string()
    .min(2, "User name must be at least 2 characters")
    .max(50, "User name must be at most 50 characters"),
  organizationName: z
    .string()
    .min(1, "Organization name is required")
    .max(100, "Organization name must be at most 100 characters"),
});
export type SetupInput = z.infer<typeof SetupInput>;

export const UserProfileUpdateInput = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(50, "Name must be at most 50 characters"),
});
export type UserProfileUpdateInput = z.infer<typeof UserProfileUpdateInput>;

export const SetupResult = z.object({
  user: User,
  organization: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),
  membership: OrganizationMembership,
});
export type SetupResult = z.infer<typeof SetupResult>;

export const UserSetupStatus = z.object({
  isCompleted: z.boolean(),
  hasUser: z.boolean(),
  hasOrganization: z.boolean(),
  user: User.nullable(),
});
export type UserSetupStatus = z.infer<typeof UserSetupStatus>;

export const UserSidebarData = z.object({
  user: z.object({
    id: z.string(),
    name: z.string(),
  }),
  organizations: z.array(z.custom<OrganizationWithRole>()),
  defaultOrganization: z
    .object({
      id: z.string(),
      name: z.string(),
      description: z.string().nullable(),
      updatedAt: z.date(),
    })
    .nullable(),
});
export type UserSidebarData = z.infer<typeof UserSidebarData>;

/* === Repository interface === */
export interface UserRepository {
  findById(userId: string): Promise<User | null>;
  setup(userId: string, input: SetupInput): Promise<SetupResult>;
  checkSetupStatus(userId: string): Promise<UserSetupStatus>;
  getSidebarData(userId: string): Promise<UserSidebarData>;
  updateProfile(userId: string, input: UserProfileUpdateInput): Promise<User>;
  updateOrganizationLatestViewedAt(
    userId: string,
    organizationId: string
  ): Promise<boolean>;
  delete(userId: string): Promise<boolean>;
}
