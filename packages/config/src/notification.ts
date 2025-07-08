import { z } from "zod";

export const DiscordNotificationSettingsSchema = z.object({
  daily: z.boolean().optional(),
  weekly: z.boolean().optional(),
  monthly: z.boolean().optional(),
});
export type DiscordNotificationSettings = z.infer<
  typeof DiscordNotificationSettingsSchema
>;
