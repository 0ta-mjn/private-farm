"use client";

import { useQuery } from "@tanstack/react-query";
import { diaries } from "@/rpc/factory";
import { Card, CardContent, CardHeader, CardTitle } from "@/shadcn/card";
import { CalendarIcon, FileTextIcon, MapPinIcon, PlusIcon } from "lucide-react";
import { Badge } from "@/shadcn/badge";
import { Skeleton } from "@/shadcn/skeleton";
import { Button } from "@/shadcn/button";
import { format, subDays } from "date-fns";
import { ja } from "date-fns/locale";
import { useDiaryDrawerActions } from "@/contexts/diary-drawer-context";
import Link from "next/link";
import { DiaryWorkTypeChip } from "@/components/diary/diary-work-type-chip";

interface DiarySummaryProps {
  organizationId: string;
}

// 作業時間を見やすい形式でフォーマット
function formatDuration(hours: number): string {
  if (hours === 0) return "0分";

  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);

  if (wholeHours === 0) {
    return `${minutes}分`;
  } else if (minutes === 0) {
    return `${wholeHours}時間`;
  } else {
    return `${wholeHours}時間${minutes}分`;
  }
}

export function DiarySummary({ organizationId }: DiarySummaryProps) {
  const today = new Date();
  const sevenDaysAgo = subDays(today, 6); // 今日を含めて7日間
  const diaryDrawerActions = useDiaryDrawerActions();

  // 過去7日間の日誌データを取得
  const { data: diaryData, isLoading } = useQuery(
    diaries.byDateRange(organizationId, {
      startDate: format(sevenDaysAgo, "yyyy-MM-dd"),
      endDate: format(today, "yyyy-MM-dd"),
    })
  );

  const recentDiaries = diaryData || [];

  // 日付ごとにグループ化（日誌配列と総作業時間を含む）
  const diariesByDate = recentDiaries.reduce(
    (acc, diary) => {
      const date = diary.date;
      if (!acc[date]) {
        acc[date] = {
          diaries: [],
          totalDuration: 0,
        };
      }
      acc[date].diaries.push(diary);
      acc[date].totalDuration += diary.duration || 0;
      return acc;
    },
    {} as Record<
      string,
      { diaries: typeof recentDiaries; totalDuration: number }
    >
  );

  // 作業種類別の統計
  const workTypeStats = recentDiaries.reduce(
    (acc, diary) => {
      if (diary.workType) {
        acc[diary.workType] = (acc[diary.workType] || 0) + 1;
      }
      return acc;
    },
    {} as Record<string, number>
  );

  // 総作業時間の計算
  const totalDuration = recentDiaries.reduce((sum, diary) => {
    return sum + (diary.duration || 0);
  }, 0);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            <CardTitle>過去7日間の活動サマリー</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-14" />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalEntries = recentDiaries.length;
  const activeDays = Object.keys(diariesByDate).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            <CardTitle>過去7日間の活動</CardTitle>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/diary">今月の日誌を確認</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 統計情報 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">活動日数</p>
            <p className="text-2xl font-bold text-primary">{activeDays}日</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">総作業時間</p>
            <p className="text-2xl font-bold text-primary">
              {formatDuration(totalDuration)}
            </p>
          </div>

          {/* 作業種類別統計 */}
          {Object.keys(workTypeStats).length > 0 && (
            <div className="lg:col-span-1">
              <p className="text-sm text-muted-foreground mb-2">作業種類</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(workTypeStats)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .map(([workType, count]) => (
                    <DiaryWorkTypeChip
                      key={workType}
                      workType={workType}
                      count={count}
                    />
                  ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-sm text-muted-foreground">記録数</p>
            <p className="text-2xl font-bold text-primary">{totalEntries}件</p>
          </div>
        </div>

        {/* 最近の記録 */}
        <div>
          <p className="text-sm text-muted-foreground mb-3">最近の記録</p>
          {totalEntries === 0 ? (
            <div className="text-center py-8">
              <FileTextIcon className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">
                過去7日間に記録された日誌がありません
              </p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                農作業の記録を追加してみましょう
              </p>
              <Button onClick={diaryDrawerActions.openCreate} className="gap-2">
                <PlusIcon className="h-4 w-4" />
                日誌を追加
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(diariesByDate)
                .sort(
                  ([a], [b]) => new Date(b).getTime() - new Date(a).getTime()
                )
                .map(([date, dateData]) => (
                  <div
                    key={date}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                  >
                    <div className="flex-shrink-0">
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(date), "M/d", { locale: ja })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ({format(new Date(date), "E", { locale: ja })})
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">
                          {dateData.diaries.length}件の記録
                        </span>
                        <span className="text-sm text-muted-foreground">
                          ({formatDuration(dateData.totalDuration)})
                        </span>
                        {dateData.diaries.length > 1 && (
                          <Badge variant="outline" className="text-xs">
                            複数作業
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1">
                        {dateData.diaries.map((diary) => {
                          return (
                            <div
                              key={diary.id}
                              className="flex items-center gap-1 flex-wrap"
                            >
                              {diary.workType && (
                                <DiaryWorkTypeChip workType={diary.workType} />
                              )}
                              {diary.fields.length > 0 && (
                                <>
                                  <MapPinIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  {diary.fields.map((dt, index: number) => (
                                    <Badge
                                      key={index}
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {dt.name}
                                    </Badge>
                                  ))}
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
