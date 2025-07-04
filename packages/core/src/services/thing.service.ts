import { eq, withUniqueIdRetry, and } from "@repo/db";
import { thingsTable } from "@repo/db/schema";
import { DEFAULT_UUID_CONFIG } from "@repo/config";
import type { Database } from "@repo/db/client";
import { z } from "zod";

// Zodスキーマ定義
export const CreateThingInputSchema = z.object({
  organizationId: z.string().min(1, "組織IDは必須です"),
  name: z
    .string()
    .min(1, "ほ場名は必須です")
    .max(255, "ほ場名は255文字以内で入力してください"),
  type: z
    .string()
    .min(1, "ほ場の種類は必須です")
    .max(100, "ほ場の種類は100文字以内で入力してください"),
  description: z
    .string()
    .max(1000, "説明は1000文字以内で入力してください")
    .optional(),
  location: z
    .string()
    .max(255, "場所は255文字以内で入力してください")
    .transform((val) => (val === "" ? null : val))
    .nullable()
    .optional(),
  area: z
    .number()
    .positive("面積は正の数で入力してください")
    .nullable()
    .optional(),
});

export const UpdateThingInputSchema = z.object({
  name: z
    .string()
    .min(1, "ほ場名は必須です")
    .max(255, "ほ場名は255文字以内で入力してください")
    .optional(),
  type: z
    .string()
    .min(1, "ほ場の種類は必須です")
    .max(100, "ほ場の種類は100文字以内で入力してください")
    .optional(),
  description: z
    .string()
    .max(1000, "説明は1000文字以内で入力してください")
    .optional(),
  location: z
    .string()
    .max(255, "場所は255文字以内で入力してください")
    .transform((val) => (val === "" ? null : val))
    .nullable()
    .optional(),
  area: z
    .number()
    .positive("面積は正の数で入力してください")
    .nullable()
    .optional(),
});

export const ThingParamsSchema = z.object({
  thingId: z.string().min(1, "ほ場IDは必須です"),
  organizationId: z.string().min(1, "組織IDは必須です"),
});

export const UpdateThingParamsSchema = ThingParamsSchema.merge(
  UpdateThingInputSchema
);

// 型定義（Zodスキーマから推論）
export type CreateThingInput = z.infer<typeof CreateThingInputSchema>;
export type UpdateThingInput = z.infer<typeof UpdateThingInputSchema>;
export type ThingParams = z.infer<typeof ThingParamsSchema>;
export type UpdateThingParams = z.infer<typeof UpdateThingParamsSchema>;

/**
 * 新しいほ場を作成します
 *
 * @param db - データベース接続
 * @param input - ほ場作成情報
 * @returns 作成されたほ場
 */
export async function createThing(db: Database, input: CreateThingInput) {
  // ほ場作成
  const thingResult = await withUniqueIdRetry(
    (thingId: string) =>
      db
        .insert(thingsTable)
        .values({
          id: thingId,
          name: input.name,
          type: input.type,
          description: input.description || "",
          location: input.location || null,
          area: input.area || null,
          organizationId: input.organizationId,
        })
        .returning(),
    { idPrefix: DEFAULT_UUID_CONFIG.thing?.idPrefix || "thing" }
  );

  const thing = thingResult[0];

  return thing;
}

/**
 * 組織に属するほ場の一覧を取得します
 *
 * @param db - データベース接続
 * @param organizationId - 組織ID
 * @returns ほ場一覧
 */
export async function getThingsByOrganization(
  db: Database,
  organizationId: string
) {
  // ほ場一覧を取得
  const things = await db
    .select()
    .from(thingsTable)
    .where(eq(thingsTable.organizationId, organizationId))
    .orderBy(thingsTable.createdAt);

  return things;
}

/**
 * ほ場の詳細を取得します
 *
 * @param db - データベース接続
 * @param params - ほ場ID と組織ID
 * @returns ほ場詳細
 */
export async function getThingById(db: Database, params: ThingParams) {
  // ほ場を取得
  const thing = await db
    .select()
    .from(thingsTable)
    .where(
      and(
        eq(thingsTable.id, params.thingId),
        eq(thingsTable.organizationId, params.organizationId)
      )
    )
    .limit(1);

  return thing[0];
}

/**
 * ほ場の情報を更新します
 *
 * @param db - データベース接続
 * @param params - 更新パラメータ
 * @returns 更新されたほ場
 */
export async function updateThing(db: Database, params: UpdateThingParams) {
  const { thingId, organizationId, ...updateData } = params;

  // ほ場情報を更新
  const updatedThing = await db
    .update(thingsTable)
    .set({
      ...updateData,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(thingsTable.id, thingId),
        eq(thingsTable.organizationId, organizationId)
      )
    )
    .returning();

  return updatedThing[0];
}

/**
 * ほ場を削除します
 *
 * @param db - データベース接続
 * @param params - ほ場ID と組織ID
 * @returns 削除の成功可否
 */
export async function deleteThing(
  db: Database,
  params: ThingParams
): Promise<boolean> {
  // ほ場を削除
  const deletedThing = await db
    .delete(thingsTable)
    .where(
      and(
        eq(thingsTable.id, params.thingId),
        eq(thingsTable.organizationId, params.organizationId)
      )
    )
    .returning();

  return deletedThing.length > 0;
}
