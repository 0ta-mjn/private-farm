import { eq, withUniqueIdRetry, and, desc, sql, gte, lte } from "@repo/dashboard-db";
import { inArray } from "drizzle-orm";
import {
  diariesTable,
  diaryThingsTable,
  thingsTable,
  usersTable,
} from "@repo/dashboard-db/schema";
import { DEFAULT_UUID_CONFIG } from "@repo/config";
import { UnauthorizedError } from "../errors";
import type { Database } from "@repo/dashboard-db/client";
import { z } from "zod";

// Zodスキーマ定義
export const CreateDiaryInputSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "日付は YYYY-MM-DD 形式で入力してください"),
  title: z.string().optional(),
  content: z.string().optional(),
  workType: z.string().min(1, "作業種別を選択してください"),
  weather: z.string().nullable().optional(),
  temperature: z.number().nullable().optional(),
  duration: z
    .number()
    .min(0.1, "作業時間は0.1時間以上で入力してください")
    .nullable()
    .optional(),
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
  weather: z.string().nullable().optional(),
  temperature: z.number().nullable().optional(),
  duration: z
    .number()
    .min(0.1, "作業時間は0.1時間以上で入力してください")
    .nullable()
    .optional(),
  thingIds: z.array(z.string()).optional(),
});

// 新しい3つのエンドポイント用のスキーマ
export const GetDiariesByDateInputSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "日付は YYYY-MM-DD 形式で入力してください"),
});

export const GetDiariesByDateRangeInputSchema = z
  .object({
    startDate: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        "開始日は YYYY-MM-DD 形式で入力してください"
      ),
    endDate: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        "終了日は YYYY-MM-DD 形式で入力してください"
      ),
  })
  .refine(
    (data) => {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      return start <= end;
    },
    {
      message: "開始日は終了日より前の日付を指定してください",
    }
  );

export const SearchDiariesInputSchema = z.object({
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

export const DiaryParamsSchema = z.object({
  diaryId: z.string().min(1, "日誌IDは必須です"),
  organizationId: z.string().min(1, "組織IDは必須です"),
});

// 型定義（Zodスキーマから推論）
export type CreateDiaryInput = z.infer<typeof CreateDiaryInputSchema>;
export type UpdateDiaryInput = z.infer<typeof UpdateDiaryInputSchema>;
export type GetDiariesByDateInput = z.infer<typeof GetDiariesByDateInputSchema>;
export type GetDiariesByDateRangeInput = z.infer<
  typeof GetDiariesByDateRangeInputSchema
>;
export type SearchDiariesInput = z.infer<typeof SearchDiariesInputSchema>;
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
  organizationId: string,
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
            eq(thingsTable.organizationId, organizationId)
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
            duration: input.duration,
            userId: userId,
            organizationId: organizationId,
          })
          .returning(),
      { idPrefix: DEFAULT_UUID_CONFIG.diary?.idPrefix || "diary" }
    );

    const diary = diaryResult[0];
    if (!diary) {
      return undefined;
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
      duration: diariesTable.duration,
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
  duration: number | null;
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
  return await db.transaction(async (tx) => {
    // thingIdsが指定されている場合、権限チェックを実行
    if (input.thingIds != undefined && input.thingIds.length > 0) {
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
      return undefined;
    }

    // ほ場関連付けの更新
    if (thingIds != undefined) {
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

/**
 * 指定した日付の日誌の全データを取得します
 *
 * @param db - データベース接続
 * @param input - 組織ID と日付
 * @returns 指定日の全日誌のフルデータ
 */
export async function getDiariesByDate(
  db: Database,
  organizationId: string,
  input: GetDiariesByDateInput
): Promise<DiaryWithOptionalThings[]> {
  // 指定日の日誌を取得（全フィールド含む）
  const diariesResult = await db
    .select({
      id: diariesTable.id,
      date: diariesTable.date,
      title: diariesTable.title,
      content: diariesTable.content,
      workType: diariesTable.workType,
      weather: diariesTable.weather,
      temperature: diariesTable.temperature,
      duration: diariesTable.duration,
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
        eq(diariesTable.organizationId, organizationId),
        eq(diariesTable.date, input.date)
      )
    )
    .orderBy(desc(diariesTable.createdAt));

  // 各日誌に対してほ場情報を取得
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

  return diariesWithThings;
}

/**
 * 指定された期間内の日誌一覧を取得します（サマリー情報）
 *
 * @param db - データベース接続
 * @param organizationId - 組織ID
 * @param input - 期間指定（最大40日）
 * @returns 期間内の日誌一覧（サマリー情報のみ）
 */
export async function getDiariesByDateRange(
  db: Database,
  organizationId: string,
  input: GetDiariesByDateRangeInput
) {
  const { startDate, endDate } = input;

  // 指定期間の日誌を取得（サマリー情報のみ）
  const diariesResult = await db
    .select({
      id: diariesTable.id,
      date: diariesTable.date,
      weather: diariesTable.weather,
      workType: diariesTable.workType,
      duration: diariesTable.duration,
    })
    .from(diariesTable)
    .where(
      and(
        eq(diariesTable.organizationId, organizationId),
        gte(diariesTable.date, startDate),
        lte(diariesTable.date, endDate)
      )
    )
    .orderBy(desc(diariesTable.date));

  // 各日誌に対してほ場の基本情報のみ取得
  const diariesWithFields = await Promise.all(
    diariesResult.map(async (diary) => {
      const fieldsResult = await db
        .select({
          id: thingsTable.id,
          name: thingsTable.name,
        })
        .from(diaryThingsTable)
        .innerJoin(thingsTable, eq(diaryThingsTable.thingId, thingsTable.id))
        .where(eq(diaryThingsTable.diaryId, diary.id));

      return {
        id: diary.id,
        date: diary.date,
        weather: diary.weather,
        workType: diary.workType,
        duration: diary.duration,
        fields: fieldsResult,
      };
    })
  );

  return diariesWithFields;
}

/**
 * 検索・フィルタリング機能付きの日誌一覧を取得します
 *
 * @param db - データベース接続
 * @param input - 検索・フィルタリング条件
 * @returns 日誌一覧、総数、ページング情報
 */
export async function searchDiaries(
  db: Database,
  organizationId: string,
  input: SearchDiariesInput
): Promise<{
  diaries: DiaryWithOptionalThings[];
  total: number;
  hasNext: boolean;
}> {
  const {
    limit,
    offset,
    search,
    workTypes,
    thingIds,
    dateFrom,
    dateTo,
    weather,
    sortBy,
    sortOrder,
  } = input;

  // WHERE条件の構築
  const whereConditions = [eq(diariesTable.organizationId, organizationId)];

  // 検索条件
  if (search) {
    whereConditions.push(sql`${diariesTable.content} ILIKE ${`%${search}%`}`);
  }

  // 作業種別フィルタ（複数選択対応）
  if (workTypes && workTypes.length > 0) {
    whereConditions.push(inArray(diariesTable.workType, workTypes));
  }

  // 天候フィルタ（複数選択対応）
  if (weather && weather.length > 0) {
    whereConditions.push(inArray(diariesTable.weather, weather));
  }

  // 日付範囲フィルタ
  if (dateFrom) {
    whereConditions.push(gte(diariesTable.date, dateFrom));
  }
  if (dateTo) {
    whereConditions.push(lte(diariesTable.date, dateTo));
  }

  // ほ場フィルタ（複数選択対応）
  let filteredDiaryIds: string[] = [];
  if (thingIds && thingIds.length > 0) {
    // 指定されたほ場IDが組織に属しているかチェック
    const thingResult = await db
      .select({ id: thingsTable.id })
      .from(thingsTable)
      .where(
        and(
          inArray(thingsTable.id, thingIds),
          eq(thingsTable.organizationId, organizationId)
        )
      );

    if (thingResult.length === 0) {
      // 指定されたほ場IDが組織に属していない場合は空の結果を返す
      return {
        diaries: [],
        total: 0,
        hasNext: false,
      };
    }

    // 指定されたほ場IDに関連する日誌IDを取得
    const diaryThingsResult = await db
      .select({ diaryId: diaryThingsTable.diaryId })
      .from(diaryThingsTable)
      .where(inArray(diaryThingsTable.thingId, thingIds));

    filteredDiaryIds = [
      ...new Set(diaryThingsResult.map((row) => row.diaryId)),
    ];

    if (filteredDiaryIds.length === 0) {
      return {
        diaries: [],
        total: 0,
        hasNext: false,
      };
    }

    whereConditions.push(inArray(diariesTable.id, filteredDiaryIds));
  }

  // ソート順の構築
  const orderConditions = [];
  switch (sortBy) {
    case "date":
      orderConditions.push(
        sortOrder === "asc" ? diariesTable.date : desc(diariesTable.date)
      );
      break;
    case "created_at":
      orderConditions.push(
        sortOrder === "asc"
          ? diariesTable.createdAt
          : desc(diariesTable.createdAt)
      );
      break;
    case "updated_at":
      orderConditions.push(
        sortOrder === "asc"
          ? diariesTable.updatedAt
          : desc(diariesTable.updatedAt)
      );
      break;
  }
  // 同じ値の場合の副次ソート
  orderConditions.push(desc(diariesTable.createdAt));

  // 総数を取得
  const totalResult = await db
    .select({ count: sql`count(*)` })
    .from(diariesTable)
    .where(and(...whereConditions));

  const total = Number(totalResult[0]?.count) || 0;

  // 日誌一覧を取得
  const diariesResult = await db
    .select({
      id: diariesTable.id,
      date: diariesTable.date,
      title: diariesTable.title,
      content: diariesTable.content,
      workType: diariesTable.workType,
      weather: diariesTable.weather,
      temperature: diariesTable.temperature,
      duration: diariesTable.duration,
      userId: diariesTable.userId,
      organizationId: diariesTable.organizationId,
      createdAt: diariesTable.createdAt,
      updatedAt: diariesTable.updatedAt,
      userName: usersTable.name,
    })
    .from(diariesTable)
    .leftJoin(usersTable, eq(diariesTable.userId, usersTable.id))
    .where(and(...whereConditions))
    .orderBy(...orderConditions)
    .limit(limit)
    .offset(offset);

  const hasNext = offset + limit < total;

  // 各日誌にほ場情報を追加
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
