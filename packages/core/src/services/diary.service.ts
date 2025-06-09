import { eq, withUniqueIdRetry, and, desc, sql, gte, lte } from "@repo/db";
import { inArray } from "drizzle-orm";
import {
  diariesTable,
  diaryThingsTable,
  thingsTable,
  usersTable,
} from "@repo/db/schema";
import {
  DEFAULT_UUID_CONFIG,
  NotFoundError,
  UnauthorizedError,
} from "@repo/config";
import type { Database, Transaction } from "@repo/db/client";
import { z } from "zod";

// Zodスキーマ定義
export const CreateDiaryInputSchema = z.object({
  organizationId: z.string().min(1, "組織IDは必須です"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "日付は YYYY-MM-DD 形式で入力してください"),
  title: z.string().optional(),
  content: z.string().optional(),
  workType: z.string().min(1, "作業種別を選択してください"),
  weather: z.string().optional(),
  temperature: z.number().optional(),
  thingIds: z.array(z.string()).optional().default([]),
});

export const UpdateDiaryInputSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "日付は YYYY-MM-DD 形式で入力してください")
    .optional(),
  title: z.string().optional(),
  content: z.string().optional(),
  workType: z.string().optional(),
  weather: z.string().optional(),
  temperature: z.number().optional(),
  thingIds: z.array(z.string()).optional(),
});

export const ListDiariesInputSchema = z.object({
  organizationId: z.string().min(1, "組織IDは必須です"),
  limit: z.number().int().min(1).max(100).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
  search: z.string().optional(),
  workType: z.string().optional(),
  thingId: z.string().optional(),
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  includeThings: z.boolean().optional(),
});

export const DiaryParamsSchema = z.object({
  diaryId: z.string().min(1, "日誌IDは必須です"),
  organizationId: z.string().min(1, "組織IDは必須です"),
});

// 型定義（Zodスキーマから推論）
export type CreateDiaryInput = z.infer<typeof CreateDiaryInputSchema>;
export type UpdateDiaryInput = z.infer<typeof UpdateDiaryInputSchema>;
export type ListDiariesInput = z.infer<typeof ListDiariesInputSchema>;
export type DiaryParams = z.infer<typeof DiaryParamsSchema>;

/**
 * 新しい農業日誌を作成します
 *
 * @param db - データベース接続
 * @param userId - ユーザーID
 * @param input - 日誌作成情報
 * @returns 作成された日誌
 */
export async function createDiary(
  db: Database,
  userId: string,
  input: CreateDiaryInput
) {
  return await db.transaction(async (tx) => {
    // thingIdが指定されている場合、権限チェックを実行
    const thingIds = input.thingIds || [];
    if (thingIds.length > 0) {
      const thingsResult = await tx
        .select({ id: thingsTable.id })
        .from(thingsTable)
        .where(
          and(
            inArray(thingsTable.id, thingIds),
            eq(thingsTable.organizationId, input.organizationId)
          )
        );

      const validThingIds = thingsResult.map((thing) => thing.id);
      const invalidThingIds = thingIds.filter(
        (thingId) => !validThingIds.includes(thingId)
      );

      if (invalidThingIds.length > 0) {
        throw new UnauthorizedError(
          `指定されたほ場ID [${invalidThingIds.join(", ")}] は存在しないか、この組織に属していません`
        );
      }
    }

    // 日誌作成
    const diaryResult = await withUniqueIdRetry(
      (diaryId: string) =>
        tx
          .insert(diariesTable)
          .values({
            id: diaryId,
            date: input.date,
            title: input.title,
            content: input.content,
            workType: input.workType,
            weather: input.weather,
            temperature: input.temperature,
            userId: userId,
            organizationId: input.organizationId,
          })
          .returning(),
      { idPrefix: DEFAULT_UUID_CONFIG.diary?.idPrefix || "diary" }
    );

    const diary = diaryResult[0]!;
    if (!diary) {
      throw new Error("日誌の作成に失敗しました");
    }

    // ほ場関連付けの作成
    if (thingIds.length > 0) {
      const diaryThingValues = thingIds.map((thingId) => ({
        diaryId: diary.id,
        thingId,
      }));

      await tx.insert(diaryThingsTable).values(diaryThingValues);
    }

    return diary;
  });
}

/**
 * 日誌IDで日誌を取得します（関連データを含む）
 *
 * @param db - データベース接続
 * @param params - 日誌IDと組織ID
 * @returns 日誌データ（見つからない場合はnull）
 */
export async function getDiary(db: Database, params: DiaryParams) {
  // 1. 日誌の基本情報を取得
  const diaryResult = await db
    .select({
      id: diariesTable.id,
      date: diariesTable.date,
      title: diariesTable.title,
      content: diariesTable.content,
      workType: diariesTable.workType,
      weather: diariesTable.weather,
      temperature: diariesTable.temperature,
      userId: diariesTable.userId,
      organizationId: diariesTable.organizationId,
      createdAt: diariesTable.createdAt,
      updatedAt: diariesTable.updatedAt,
      userName: usersTable.name,
    })
    .from(diariesTable)
    .leftJoin(usersTable, eq(diariesTable.userId, usersTable.id))
    .where(
      and(
        eq(diariesTable.id, params.diaryId),
        eq(diariesTable.organizationId, params.organizationId)
      )
    );

  if (diaryResult.length === 0) {
    return null;
  }

  const diary = diaryResult[0]!;

  // 2. 関連するほ場情報を取得
  const diaryThingsResult = await db
    .select({
      thingId: diaryThingsTable.thingId,
      thingName: thingsTable.name,
      thingType: thingsTable.type,
      thingDescription: thingsTable.description,
      thingLocation: thingsTable.location,
      thingArea: thingsTable.area,
    })
    .from(diaryThingsTable)
    .innerJoin(thingsTable, eq(diaryThingsTable.thingId, thingsTable.id))
    .where(eq(diaryThingsTable.diaryId, params.diaryId));

  // 3. レスポンスの整形
  const diaryThings = diaryThingsResult.map((row) => ({
    thingId: row.thingId,
    thing: {
      id: row.thingId,
      name: row.thingName,
      type: row.thingType,
      description: row.thingDescription,
      location: row.thingLocation,
      area: row.thingArea,
    },
  }));

  return {
    ...diary,
    diaryThings,
  };
}

// 型定義
type DiaryWithOptionalThings = {
  id: string;
  date: string;
  title: string | null;
  content: string | null;
  workType: string | null;
  weather: string | null;
  temperature: number | null;
  userId: string | null;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
  userName: string | null;
  diaryThings?: Array<{
    thingId: string;
    thing: {
      id: string;
      name: string;
      type: string;
      description: string | null;
      location: string | null;
      area: number | null;
    };
  }>;
};

/**
 * 日誌の一覧を取得します
 *
 * @param db - データベース接続
 * @param input - 検索・フィルタリング条件
 * @returns 日誌一覧と総数
 */
export async function listDiaries(
  db: Database,
  input: ListDiariesInput
): Promise<{
  diaries: DiaryWithOptionalThings[];
  total: number;
  hasNext: boolean;
}> {
  // デフォルト値の設定
  const limit = input.limit ?? 20;
  const offset = input.offset ?? 0;
  const includeThings = input.includeThings ?? false;

  // 基本的なクエリ条件
  let whereConditions = [eq(diariesTable.organizationId, input.organizationId)];

  // thingIdフィルタがある場合は、そのほ場に関連する日誌IDsを先に取得
  let filteredDiaryIds: string[] | null = null;
  if (input.thingId) {
    // まず、指定されたthingIdが組織に属することを確認
    const thingResult = await db
      .select({ id: thingsTable.id })
      .from(thingsTable)
      .where(
        and(
          eq(thingsTable.id, input.thingId),
          eq(thingsTable.organizationId, input.organizationId)
        )
      );

    if (thingResult.length === 0) {
      // 指定されたthingIdが組織に属していない場合は空の結果を返す
      return {
        diaries: [],
        total: 0,
        hasNext: false,
      };
    }

    const diaryThingsResult = await db
      .select({ diaryId: diaryThingsTable.diaryId })
      .from(diaryThingsTable)
      .where(eq(diaryThingsTable.thingId, input.thingId));

    filteredDiaryIds = diaryThingsResult.map((row) => row.diaryId);

    if (filteredDiaryIds.length === 0) {
      // 該当する日誌がない場合は空の結果を返す
      return {
        diaries: [],
        total: 0,
        hasNext: false,
      };
    }

    whereConditions.push(inArray(diariesTable.id, filteredDiaryIds));
  }

  // 検索条件の追加
  if (input.search) {
    // 単純な実装として、contentにlike検索を適用
    // 本格的には全文検索エンジンを使用する
    whereConditions.push(
      sql`${diariesTable.content} ILIKE ${`%${input.search}%`}`
    );
  }

  if (input.workType) {
    whereConditions.push(eq(diariesTable.workType, input.workType));
  }

  if (input.dateFrom) {
    whereConditions.push(gte(diariesTable.date, input.dateFrom));
  }

  if (input.dateTo) {
    whereConditions.push(lte(diariesTable.date, input.dateTo));
  }

  // 総数の取得
  const totalResult = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(diariesTable)
    .where(and(...whereConditions));

  const total = totalResult[0]?.count || 0;

  // 日誌一覧の取得
  const diariesResult = await db
    .select({
      id: diariesTable.id,
      date: diariesTable.date,
      title: diariesTable.title,
      content: diariesTable.content,
      workType: diariesTable.workType,
      weather: diariesTable.weather,
      temperature: diariesTable.temperature,
      userId: diariesTable.userId,
      organizationId: diariesTable.organizationId,
      createdAt: diariesTable.createdAt,
      updatedAt: diariesTable.updatedAt,
      userName: usersTable.name,
    })
    .from(diariesTable)
    .leftJoin(usersTable, eq(diariesTable.userId, usersTable.id))
    .where(and(...whereConditions))
    .orderBy(desc(diariesTable.date), desc(diariesTable.createdAt))
    .limit(limit)
    .offset(offset);

  const hasNext = offset + limit < total;

  // includeThingsがtrueの場合、ほ場情報も含める
  if (includeThings === true) {
    const diariesWithThings = await Promise.all(
      diariesResult.map(async (diary) => {
        const diaryThingsResult = await db
          .select({
            thingId: diaryThingsTable.thingId,
            thingName: thingsTable.name,
            thingType: thingsTable.type,
            thingDescription: thingsTable.description,
            thingLocation: thingsTable.location,
            thingArea: thingsTable.area,
          })
          .from(diaryThingsTable)
          .innerJoin(thingsTable, eq(diaryThingsTable.thingId, thingsTable.id))
          .where(eq(diaryThingsTable.diaryId, diary.id));

        const diaryThings = diaryThingsResult.map((row) => ({
          thingId: row.thingId,
          thing: {
            id: row.thingId,
            name: row.thingName,
            type: row.thingType,
            description: row.thingDescription,
            location: row.thingLocation,
            area: row.thingArea,
          },
        }));

        return {
          ...diary,
          diaryThings,
        };
      })
    );

    return {
      diaries: diariesWithThings,
      total,
      hasNext,
    };
  }

  return {
    diaries: diariesResult,
    total,
    hasNext,
  };
}

/**
 * 日誌を更新します
 *
 * @param db - データベース接続
 * @param userId - ユーザーID
 * @param params - 日誌ID と組織ID
 * @param input - 更新データ
 * @returns 更新された日誌
 */
export async function updateDiary(
  db: Database,
  userId: string,
  params: DiaryParams,
  input: UpdateDiaryInput
) {
  console.info("Updating diary with params:", params, "and input:", input);
  return await db.transaction(async (tx) => {
    // thingIdsが指定されている場合、権限チェックを実行
    if (input.thingIds !== undefined && input.thingIds.length > 0) {
      const thingsResult = await tx
        .select({ id: thingsTable.id })
        .from(thingsTable)
        .where(
          and(
            inArray(thingsTable.id, input.thingIds),
            eq(thingsTable.organizationId, params.organizationId)
          )
        );

      const validThingIds = thingsResult.map((thing) => thing.id);
      const invalidThingIds = input.thingIds.filter(
        (thingId: string) => !validThingIds.includes(thingId)
      );

      if (invalidThingIds.length > 0) {
        throw new UnauthorizedError(
          `指定されたほ場ID [${invalidThingIds.join(", ")}] は存在しないか、この組織に属していません`
        );
      }
    }

    // 日誌の更新
    const { thingIds, ...updateData } = input;
    const updateResult = await tx
      .update(diariesTable)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(diariesTable.id, params.diaryId),
          eq(diariesTable.organizationId, params.organizationId)
        )
      )
      .returning();

    const updatedDiary = updateResult[0];
    if (!updatedDiary) {
      throw new NotFoundError("日誌が見つからないか、更新権限がありません");
    }

    // ほ場関連付けの更新
    if (thingIds !== undefined) {
      // 既存の関連付けを削除
      await tx
        .delete(diaryThingsTable)
        .where(eq(diaryThingsTable.diaryId, params.diaryId));

      // 新しい関連付けを作成
      if (thingIds.length > 0) {
        const diaryThingValues = thingIds.map((thingId: string) => ({
          diaryId: params.diaryId,
          thingId,
        }));

        await tx.insert(diaryThingsTable).values(diaryThingValues);
      }
    }

    return updatedDiary;
  });
}

/**
 * 日誌を削除します
 *
 * @param db - データベース接続
 * @param userId - ユーザーID
 * @param params - 日誌ID と組織ID
 * @returns 削除に成功した場合true
 */
export async function deleteDiary(
  db: Database,
  userId: string,
  params: DiaryParams
): Promise<boolean> {
  const deleteResult = await db
    .delete(diariesTable)
    .where(
      and(
        eq(diariesTable.id, params.diaryId),
        eq(diariesTable.organizationId, params.organizationId)
      )
    )
    .returning();

  return deleteResult.length > 0;
}
