import { z } from "zod";

/* === DTO === */
export const Thing = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  type: z.string(),
  description: z.string().nullable(),
  location: z.string().nullable(),
  area: z.number().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Thing = z.infer<typeof Thing>;

export const CreateThingInput = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name must be at most 255 characters"),
  type: z
    .string()
    .min(1, "Type is required")
    .max(100, "Type must be at most 100 characters"),
  description: z
    .string()
    .max(1000, "Description must be at most 1000 characters")
    .optional(),
  location: z
    .string()
    .max(255, "Location must be at most 255 characters")
    .transform((val) => (val === "" ? null : val))
    .nullable()
    .optional(),
  area: z
    .number()
    .positive("Area must be a positive number")
    .nullable()
    .optional(),
});
export type CreateThingInput = z.infer<typeof CreateThingInput>;

export const UpdateThingInput = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name must be at most 255 characters")
    .optional(),
  type: z
    .string()
    .min(1, "Type is required")
    .max(100, "Type must be at most 100 characters")
    .optional(),
  description: z
    .string()
    .max(1000, "Description must be at most 1000 characters")
    .optional(),
  location: z
    .string()
    .max(255, "Location must be at most 255 characters")
    .transform((val) => (val === "" ? null : val))
    .nullable()
    .optional(),
  area: z
    .number()
    .positive("Area must be a positive number")
    .nullable()
    .optional(),
});
export type UpdateThingInput = z.infer<typeof UpdateThingInput>;

export const ThingParams = z.object({
  thingId: z.string().min(1, "Thing ID is required"),
  organizationId: z.string().min(1, "Organization ID is required"),
});
export type ThingParams = z.infer<typeof ThingParams>;

/* === Repository interface === */
export interface ThingRepository {
  create(input: CreateThingInput): Promise<Thing>;
  findById(params: ThingParams): Promise<Thing | null>;
  listByOrganizationId(organizationId: string): Promise<Thing[]>;
  update(params: ThingParams, input: UpdateThingInput): Promise<Thing>;
  delete(params: ThingParams): Promise<boolean>;
}
