import { z } from "zod";
import { MembershipParams } from "./organization";

/* === DTO === */
export const Diary = z.object({
  id: z.string(),
  date: z.string(),
  title: z.string().nullable(),
  content: z.string().nullable(),
  workType: z.string().nullable(),
  weather: z.string().nullable(),
  temperature: z.number().nullable(),
  duration: z.number().nullable(),
  userId: z.string().nullable(),
  organizationId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Diary = z.infer<typeof Diary>;

export const DiaryThing = z.object({
  thingId: z.string(),
  thing: z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    description: z.string().nullable(),
    location: z.string().nullable(),
    area: z.number().nullable(),
  }),
});
export type DiaryThing = z.infer<typeof DiaryThing>;

export const DiaryWithThings = Diary.extend({
  userName: z.string().nullable(),
  diaryThings: z.array(DiaryThing).optional(),
});
export type DiaryWithThings = z.infer<typeof DiaryWithThings>;

export const CreateDiaryInput = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  title: z.string().optional(),
  content: z.string().optional(),
  workType: z.string().min(1, "Work type is required"),
  weather: z.string().nullable().optional(),
  temperature: z.number().nullable().optional(),
  duration: z
    .number()
    .min(0.1, "Duration must be at least 0.1 hours")
    .nullable()
    .optional(),
  thingIds: z.array(z.string()).optional().default([]),
});
export type CreateDiaryInput = z.infer<typeof CreateDiaryInput>;

export const UpdateDiaryInput = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional(),
  title: z.string().optional(),
  content: z.string().optional(),
  workType: z.string().optional(),
  weather: z.string().nullable().optional(),
  temperature: z.number().nullable().optional(),
  duration: z
    .number()
    .min(0.1, "Duration must be at least 0.1 hours")
    .nullable()
    .optional(),
  thingIds: z.array(z.string()).optional(),
});
export type UpdateDiaryInput = z.infer<typeof UpdateDiaryInput>;

export const GetDiariesByDateInput = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
});
export type GetDiariesByDateInput = z.infer<typeof GetDiariesByDateInput>;

export const GetDiariesByDateRangeInput = z
  .object({
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format"),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format"),
  })
  .refine(
    (data) => {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      return start <= end;
    },
    {
      message: "Start date must be before end date",
    }
  );
export type GetDiariesByDateRangeInput = z.infer<
  typeof GetDiariesByDateRangeInput
>;

export const SearchDiariesInput = z.object({
  limit: z.number().int().min(1).max(100).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
  search: z.string().optional(),
  workTypes: z.array(z.string()).optional(),
  thingIds: z.array(z.string()).optional(),
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  weather: z.array(z.string()).optional(),
  sortBy: z.enum(["date", "created_at", "updated_at"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
export type SearchDiariesInput = z.infer<typeof SearchDiariesInput>;

export const DiaryParams = z.object({
  diaryId: z.string().min(1, "日誌IDは必須です"),
  organizationId: z.string().min(1, "組織IDは必須です"),
});
export type DiaryParams = z.infer<typeof DiaryParams>;

export const DiaryDateRangeSummary = z.object({
  id: z.string(),
  date: z.string(),
  weather: z.string().nullable(),
  workType: z.string().nullable(),
  duration: z.number().nullable(),
  fields: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
    })
  ),
});
export type DiaryDateRangeSummary = z.infer<typeof DiaryDateRangeSummary>;

export const SearchDiariesResult = z.object({
  diaries: z.array(DiaryWithThings),
  total: z.number(),
  hasNext: z.boolean(),
});
export type SearchDiariesResult = z.infer<typeof SearchDiariesResult>;

/* === Daily Digest Types === */
export const WorkTypeSummary = z.object({
  workType: z.string(),
  count: z.number(),
  totalDuration: z.number(),
});
export type WorkTypeSummary = z.infer<typeof WorkTypeSummary>;

export const FieldSummary = z.object({
  fieldName: z.string(),
  totalDuration: z.number(),
});
export type FieldSummary = z.infer<typeof FieldSummary>;

export const DiaryEntry = z.object({
  id: z.string(),
  title: z.string().nullable(),
  workType: z.string().nullable(),
  duration: z.number().nullable(),
  userName: z.string().nullable(),
  fieldNames: z.array(z.string()),
  createdAt: z.date(),
});
export type DiaryEntry = z.infer<typeof DiaryEntry>;

export const DailyDigestData = z.object({
  date: z.string(),
  totalEntries: z.number(),
  totalDuration: z.number(),
  totalFields: z.number(),
  workTypeSummary: z.array(WorkTypeSummary),
  fieldSummary: z.array(FieldSummary),
  recentEntries: z.array(DiaryEntry),
});
export type DailyDigestData = z.infer<typeof DailyDigestData>;

/* === Repository interface === */
export interface DiaryRepository {
  create(membership: MembershipParams, input: CreateDiaryInput): Promise<Diary>;
  findById(params: DiaryParams): Promise<DiaryWithThings | null>;
  findByDate(
    organizationId: string,
    input: GetDiariesByDateInput
  ): Promise<DiaryWithThings[]>;
  findByDateRange(
    organizationId: string,
    input: GetDiariesByDateRangeInput
  ): Promise<DiaryDateRangeSummary[]>;
  search(
    organizationId: string,
    input: SearchDiariesInput
  ): Promise<SearchDiariesResult>;
  getDailyDigestData(
    organizationId: string,
    targetDate: string
  ): Promise<DailyDigestData>;
  update(params: DiaryParams, input: UpdateDiaryInput): Promise<Diary>;
  delete(params: DiaryParams): Promise<boolean>;
}
