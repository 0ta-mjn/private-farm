import { z } from "zod";

export const ReviewerRuntimeConfigSchema = z.object({
  ENCRYPTION_KEY: z
    .string()
    .min(1, "Discord encryption key is required"),
});

export type ReviewerRuntimeConfig = z.infer<typeof ReviewerRuntimeConfigSchema>;

export function getReviewerRuntimeConfig<
  T extends Record<string, unknown> = ReviewerRuntimeConfig,
>(env: T): ReviewerRuntimeConfig {
  return ReviewerRuntimeConfigSchema.parse(env);
}
