import {
  DiaryRepository,
  CreateDiaryInput,
  UpdateDiaryInput,
  DiaryParams,
  DiaryWithThings,
  GetDiariesByDateInput,
  GetDiariesByDateRangeInput,
  SearchDiariesInput,
  SearchDiariesResult,
  DiaryDateRangeSummary,
  Diary,
  DailyDigestData,
} from "../../../interfaces/diary";
import { MembershipParams } from "../../../interfaces/organization";
import {
  diariesTable,
  diaryThingsTable,
  thingsTable,
  usersTable,
} from "../schema";
import { withUniqueIdRetry } from "../utils";
import { DEFAULT_UUID_CONFIG } from "@repo/config";
import { and, eq, desc, inArray, gte, lte, like, sql, count, sum } from "drizzle-orm";
import { Database } from "../client";
import { DashboardDBError } from "../../../errors";

export class D1DiaryRepo implements DiaryRepository {
  constructor(private db: Database) {}

  async create(
    membership: MembershipParams,
    input: CreateDiaryInput
  ): Promise<Diary> {
    const { userId, organizationId } = membership;
    // TODO D1がトランザクションに対応したら、トランザクションを使用
    // thingIdが指定されている場合、権限チェックを実行
    const thingIds = input.thingIds || [];
    if (thingIds.length > 0) {
      const thingsResult = await this.db
        .select({ id: thingsTable.id })
        .from(thingsTable)
        .where(
          and(
            inArray(thingsTable.id, thingIds),
            eq(thingsTable.organizationId, organizationId)
          )
        )
        .all();

      const validThingIds = thingsResult.map((thing) => thing.id);
      const invalidThingIds = thingIds.filter(
        (thingId) => !validThingIds.includes(thingId)
      );

      if (invalidThingIds.length > 0) {
        throw new DashboardDBError(
          "invalid_input",
          `指定されたほ場ID [${invalidThingIds.join(", ")}] は存在しないか、この組織に属していません`
        );
      }
    }

    // 日誌作成
    const diaryResult = await withUniqueIdRetry(
      (diaryId: string) =>
        this.db
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
      { idPrefix: DEFAULT_UUID_CONFIG.diary.idPrefix }
    );

    const diary = diaryResult[0];
    if (!diary) {
      throw new DashboardDBError("internal_error", "Failed to create diary");
    }

    // ほ場関連付けの作成
    if (thingIds.length > 0) {
      const diaryThingValues = thingIds.map((thingId) => ({
        diaryId: diary.id,
        thingId,
      }));

      await this.db.insert(diaryThingsTable).values(diaryThingValues);
    }

    return diary;
  }

  async findById(params: DiaryParams): Promise<DiaryWithThings | null> {
    // 1. 日誌の基本情報を取得
    const diaryResult = await this.db
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
      )
      .get();

    if (!diaryResult) {
      return null;
    }

    // 2. 関連するほ場情報を取得
    const diaryThingsResult = await this.db
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
      .where(eq(diaryThingsTable.diaryId, params.diaryId))
      .all();

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
      ...diaryResult,
      diaryThings,
    };
  }

  async findByDate(
    organizationId: string,
    input: GetDiariesByDateInput
  ): Promise<DiaryWithThings[]> {
    // 指定日の日誌を取得（全フィールド含む）
    const diariesResult = await this.db
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
      .orderBy(desc(diariesTable.createdAt))
      .all();

    // 各日誌に対してほ場情報を取得
    const diariesWithThings = await Promise.all(
      diariesResult.map(async (diary) => {
        const diaryThingsResult = await this.db
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
          .where(eq(diaryThingsTable.diaryId, diary.id))
          .all();

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

  async findByDateRange(
    organizationId: string,
    input: GetDiariesByDateRangeInput
  ): Promise<DiaryDateRangeSummary[]> {
    const { startDate, endDate } = input;

    // 指定期間の日誌を取得（サマリー情報のみ）
    const diariesResult = await this.db
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
      .orderBy(desc(diariesTable.date))
      .all();

    // 各日誌の関連ほ場情報を取得
    const diariesWithFields = await Promise.all(
      diariesResult.map(async (diary) => {
        const fieldsResult = await this.db
          .select({
            id: thingsTable.id,
            name: thingsTable.name,
          })
          .from(diaryThingsTable)
          .innerJoin(thingsTable, eq(diaryThingsTable.thingId, thingsTable.id))
          .where(eq(diaryThingsTable.diaryId, diary.id))
          .all();

        return {
          ...diary,
          fields: fieldsResult,
        };
      })
    );

    return diariesWithFields;
  }

  async search(
    organizationId: string,
    input: SearchDiariesInput
  ): Promise<SearchDiariesResult> {
    const {
      limit = 20,
      offset = 0,
      search,
      workTypes,
      thingIds,
      dateFrom,
      dateTo,
      weather,
      sortBy = "date",
      sortOrder = "desc",
    } = input;

    // WHERE条件を構築
    const conditions = [eq(diariesTable.organizationId, organizationId)];

    // 検索キーワード（サービス側と同じくcontentのみ検索）
    if (search) {
      conditions.push(like(diariesTable.content, `%${search}%`));
    }

    // 作業種別フィルタ
    if (workTypes && workTypes.length > 0) {
      conditions.push(inArray(diariesTable.workType, workTypes));
    }

    // 日付範囲フィルタ
    if (dateFrom) {
      conditions.push(gte(diariesTable.date, dateFrom));
    }
    if (dateTo) {
      conditions.push(lte(diariesTable.date, dateTo));
    }

    // 天気フィルタ
    if (weather && weather.length > 0) {
      conditions.push(inArray(diariesTable.weather, weather));
    }

    // ほ場フィルタの処理（サービス側のロジックに合わせる）
    if (thingIds && thingIds.length > 0) {
      // 指定されたほ場IDが組織に属しているかチェック
      const thingResult = await this.db
        .select({ id: thingsTable.id })
        .from(thingsTable)
        .where(
          and(
            inArray(thingsTable.id, thingIds),
            eq(thingsTable.organizationId, organizationId)
          )
        )
        .all();

      if (thingResult.length === 0) {
        // 指定されたほ場IDが組織に属していない場合は空の結果を返す
        return {
          diaries: [],
          total: 0,
          hasNext: false,
        };
      }

      // 指定されたほ場IDに関連する日誌IDを取得
      const diaryThingsResult = await this.db
        .select({ diaryId: diaryThingsTable.diaryId })
        .from(diaryThingsTable)
        .where(inArray(diaryThingsTable.thingId, thingIds))
        .all();

      const filteredDiaryIds = [
        ...new Set(diaryThingsResult.map((row) => row.diaryId)),
      ];

      if (filteredDiaryIds.length === 0) {
        return {
          diaries: [],
          total: 0,
          hasNext: false,
        };
      }

      conditions.push(inArray(diariesTable.id, filteredDiaryIds));
    }

    // ソート条件を定義
    const sortColumn =
      sortBy === "date"
        ? diariesTable.date
        : sortBy === "created_at"
          ? diariesTable.createdAt
          : diariesTable.updatedAt;

    // 総数を取得
    const totalResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(diariesTable)
      .where(and(...conditions))
      .get();
    const total = totalResult?.count || 0;

    // 日誌一覧を取得
    const diariesResult = await this.db
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
      .where(and(...conditions))
      .orderBy(
        sortOrder === "asc" ? sortColumn : desc(sortColumn),
        desc(diariesTable.createdAt)
      )
      .limit(limit)
      .offset(offset)
      .all();

    const hasNext = offset + limit < total;

    // 各日誌に対してほ場情報を取得
    const diariesWithThings = await Promise.all(
      diariesResult.map(async (diary) => {
        const diaryThingsResult = await this.db
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
          .where(eq(diaryThingsTable.diaryId, diary.id))
          .all();

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

  async update(params: DiaryParams, input: UpdateDiaryInput): Promise<Diary> {
    // TODO D1がトランザクションに対応したら、トランザクションを使用
      // thingIdsが指定されている場合、権限チェックを実行
      if (input.thingIds != undefined && input.thingIds.length > 0) {
        const thingsResult = await this.db
          .select({ id: thingsTable.id })
          .from(thingsTable)
          .where(
            and(
              inArray(thingsTable.id, input.thingIds),
              eq(thingsTable.organizationId, params.organizationId)
            )
          )
          .all();

        const validThingIds = thingsResult.map((thing) => thing.id);
        const invalidThingIds = input.thingIds.filter(
          (thingId: string) => !validThingIds.includes(thingId)
        );

        if (invalidThingIds.length > 0) {
          throw new DashboardDBError(
            "invalid_input",
            `指定されたほ場ID [${invalidThingIds.join(", ")}] は存在しないか、この組織に属していません`
          );
        }
      }

      // 日誌の更新
      const { thingIds, ...updateData } = input;
      const updateResult = await this.db
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
        throw new DashboardDBError(
          "not_found",
          `Diary with id ${params.diaryId} not found in organization ${params.organizationId}`
        );
      }

      // ほ場関連付けの更新
      if (thingIds != undefined) {
        // 既存の関連付けを削除
        await this.db
          .delete(diaryThingsTable)
          .where(eq(diaryThingsTable.diaryId, params.diaryId));

        // 新しい関連付けを作成
        if (thingIds.length > 0) {
          const diaryThingValues = thingIds.map((thingId: string) => ({
            diaryId: params.diaryId,
            thingId,
          }));

          await this.db.insert(diaryThingsTable).values(diaryThingValues);
        }
      }

      return updatedDiary;
  }

  async delete(params: DiaryParams): Promise<boolean> {
    const deleteResult = await this.db
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

  async getDailyDigestData(
    organizationId: string,
    targetDate: string
  ): Promise<DailyDigestData> {
    // 1. 基本統計を取得
    const basicStats = await this.db
      .select({
        totalEntries: count(diariesTable.id),
        totalDuration: sum(diariesTable.duration),
      })
      .from(diariesTable)
      .where(
        and(
          eq(diariesTable.organizationId, organizationId),
          eq(diariesTable.date, targetDate)
        )
      );

    const stats = basicStats[0] || { totalEntries: 0, totalDuration: 0 };

    // 2. 作業種別サマリーを取得
    const workTypeData = await this.db
      .select({
        workType: diariesTable.workType,
        count: count(diariesTable.id),
        totalDuration: sum(diariesTable.duration),
      })
      .from(diariesTable)
      .where(
        and(
          eq(diariesTable.organizationId, organizationId),
          eq(diariesTable.date, targetDate)
        )
      )
      .groupBy(diariesTable.workType)
      .orderBy(desc(count(diariesTable.id)));

    // 3. ほ場別サマリーを取得
    const fieldData = await this.db
      .select({
        fieldName: thingsTable.name,
        totalDuration: sum(diariesTable.duration),
      })
      .from(diariesTable)
      .innerJoin(diaryThingsTable, eq(diariesTable.id, diaryThingsTable.diaryId))
      .innerJoin(thingsTable, eq(diaryThingsTable.thingId, thingsTable.id))
      .where(
        and(
          eq(diariesTable.organizationId, organizationId),
          eq(diariesTable.date, targetDate)
        )
      )
      .groupBy(thingsTable.name)
      .orderBy(desc(sum(diariesTable.duration)));

    // 4. ユニークなほ場数を取得
    const uniqueFields = await this.db
      .selectDistinct({ thingId: diaryThingsTable.thingId })
      .from(diariesTable)
      .innerJoin(diaryThingsTable, eq(diariesTable.id, diaryThingsTable.diaryId))
      .where(
        and(
          eq(diariesTable.organizationId, organizationId),
          eq(diariesTable.date, targetDate)
        )
      );

    // 5. 最新の日誌エントリを取得
    const recentEntries = await this.db
      .select({
        id: diariesTable.id,
        title: diariesTable.title,
        workType: diariesTable.workType,
        duration: diariesTable.duration,
        userName: usersTable.name,
        createdAt: diariesTable.createdAt,
      })
      .from(diariesTable)
      .leftJoin(usersTable, eq(diariesTable.userId, usersTable.id))
      .where(
        and(
          eq(diariesTable.organizationId, organizationId),
          eq(diariesTable.date, targetDate)
        )
      )
      .orderBy(desc(diariesTable.createdAt));

    // 各エントリのほ場名を取得
    const entriesWithFields = await Promise.all(
      recentEntries.map(async (entry) => {
        const fields = await this.db
          .select({ name: thingsTable.name })
          .from(diaryThingsTable)
          .innerJoin(thingsTable, eq(diaryThingsTable.thingId, thingsTable.id))
          .where(eq(diaryThingsTable.diaryId, entry.id));

        return {
          ...entry,
          fieldNames: fields.map((f) => f.name),
        };
      })
    );

    return {
      date: targetDate,
      totalEntries: Number(stats.totalEntries),
      totalDuration: Number(stats.totalDuration) || 0,
      totalFields: uniqueFields.length,
      workTypeSummary: workTypeData.map((item) => ({
        workType: item.workType || "未分類",
        count: Number(item.count),
        totalDuration: Number(item.totalDuration) || 0,
      })),
      fieldSummary: fieldData.map((item) => ({
        fieldName: item.fieldName,
        totalDuration: Number(item.totalDuration) || 0,
      })),
      recentEntries: entriesWithFields,
    };
  }
}
