import { z } from "zod";
import { DiscordNotificationSettings } from "@repo/config";

/* === DTO === */
export const Organization = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Organization = z.infer<typeof Organization>;

export const MemberRole = z.enum(["admin"]);
export type MemberRole = z.infer<typeof MemberRole>;

export const OrganizationWithRole = Organization.extend({
  role: MemberRole.nullable(),
  joinedAt: z.date(),
});
export type OrganizationWithRole = z.infer<typeof OrganizationWithRole>;

export const CreateOrganizationInput = z.object({
  organizationName: z
    .string()
    .min(1, "Organization name is required")
    .max(100, "Organization name must be at most 100 characters"),
  description: z.string().optional(),
});
export type CreateOrganizationInput = z.infer<typeof CreateOrganizationInput>;

export const UpdateOrganizationInput = z.object({
  name: z
    .string()
    .min(1, "Organization name is required")
    .max(100, "Organization name must be at most 100 characters"),
  description: z.string().optional(),
});
export type UpdateOrganizationInput = z.infer<typeof UpdateOrganizationInput>;

export const OrganizationMembership = z.object({
  id: z.string(),
  userId: z.string(),
  organizationId: z.string(),
  role: MemberRole.nullable(),
  createdAt: z.date(),
});
export type OrganizationMembership = z.infer<typeof OrganizationMembership>;

export const CreateOrganizationResult = z.object({
  organization: Organization,
  membership: OrganizationMembership,
});
export type CreateOrganizationResult = z.infer<typeof CreateOrganizationResult>;

export const MembershipParams = z.object({
  userId: z.string(),
  organizationId: z.string(),
});
export type MembershipParams = z.infer<typeof MembershipParams>;

/**
 * 通知が有効な組織とチャンネル情報の型定義
 */
export interface OrganizationWithNotification {
  organizationId: string;
  organizationName: string;
  channels: {
    channelUuid: string;
    channelName: string;
    webhookId: string;
    webhookToken: string;
    notificationSettings: DiscordNotificationSettings;
  }[];
}

/* === Repository interface === */
export interface OrganizationRepository {
  create(
    userId: string,
    input: CreateOrganizationInput
  ): Promise<CreateOrganizationResult>;
  findById(id: string): Promise<OrganizationWithRole | null>;
  listByUser(userId: string): Promise<OrganizationWithRole[]>;
  findAllWithNotification(
    notificationType: keyof Pick<
      DiscordNotificationSettings,
      "daily" | "weekly" | "monthly"
    >
  ): Promise<OrganizationWithNotification[]>;
  update(id: string, input: UpdateOrganizationInput): Promise<Organization>;
  delete(id: string): Promise<boolean>;
  checkMembership(params: MembershipParams, role?: MemberRole): Promise<void>;
}
