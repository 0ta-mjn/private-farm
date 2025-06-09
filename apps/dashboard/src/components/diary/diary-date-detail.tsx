"use client";

import React from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/shadcn/card";
import { Badge } from "@/shadcn/badge";
import { Button } from "@/shadcn/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shadcn/dropdown-menu";
import {
  CalendarIcon,
  MapPinIcon,
  MoreHorizontalIcon,
  EditIcon,
  TrashIcon,
} from "lucide-react";
import {
  WEATHER_DISPLAY_OPTIONS,
  WORK_TYPE_DISPLAY_OPTIONS,
} from "@repo/config";

interface DiaryDateDetailProps {
  selectedDate: Date;
  organizationId: string;
  onDiaryClick?: (diaryId: string) => void;
  onEdit?: (diaryId: string) => void;
  onDelete?: (diaryId: string) => void;
  currentUserId?: string;
}

// 作業種別の表示テキストを取得するヘルパー関数
const getWorkTypeDisplay = (workType: string | null | undefined): string => {
  if (!workType) return "未設定";
  return (
    WORK_TYPE_DISPLAY_OPTIONS.find((option) => option.value === workType)
      ?.label || workType
  );
};

// 天気の表示テキストを取得するヘルパー関数
const getWeatherDisplay = (
  weather: string | null | undefined
): string | null => {
  if (!weather) return null;
  return (
    WEATHER_DISPLAY_OPTIONS.find((option) => option.value === weather)?.label ||
    weather
  );
};

export function DiaryDateDetail({
  selectedDate,
  organizationId,
  onEdit,
  onDelete,
  currentUserId,
}: DiaryDateDetailProps) {
  const trpc = useTRPC();

  // 選択した日付の日誌データをフェッチ
  const dateString = format(selectedDate, "yyyy-MM-dd");
  const diariesQueryOptions = trpc.diary.byDate.queryOptions(
    {
      organizationId,
      date: dateString,
    },
    {
      enabled: !!organizationId && !!selectedDate,
      staleTime: 5 * 60 * 1000, // 5分間キャッシュ
    }
  );

  const { data: diariesData, isLoading } = useQuery(diariesQueryOptions);

  // APIから返されるデータは直接配列形式
  const diaries = diariesData || [];

  const handleEdit = (diaryId: string) => {
    if (onEdit) {
      onEdit(diaryId);
    }
  };

  const handleDelete = (diaryId: string) => {
    if (onDelete) {
      onDelete(diaryId);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {format(selectedDate, "M月d日(E)", { locale: ja })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : diaries.length > 0 ? (
            <div className="space-y-3">
              {diaries.map((diary) => {
                const isCurrentUser = currentUserId === diary.userId;
                return (
                  <div key={diary.id} className="p-4 border rounded-lg">
                    <div className="space-y-3">
                      {/* ヘッダー: 作業種別、タイトルと操作メニュー */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {getWorkTypeDisplay(diary.workType)}
                          </Badge>
                          {diary.title && (
                            <span className="text-sm font-medium text-foreground">
                              {diary.title}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {/* 天気・気温情報 */}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {getWeatherDisplay(diary.weather) && (
                              <span>{getWeatherDisplay(diary.weather)}</span>
                            )}
                            {diary.temperature && (
                              <>
                                {getWeatherDisplay(diary.weather) && (
                                  <span>•</span>
                                )}
                                <span>{diary.temperature}°C</span>
                              </>
                            )}
                          </div>
                          {/* 操作メニュー */}
                          {isCurrentUser && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                >
                                  <MoreHorizontalIcon className="h-4 w-4" />
                                  <span className="sr-only">
                                    メニューを開く
                                  </span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleEdit(diary.id)}
                                >
                                  <EditIcon className="mr-2 h-4 w-4 text-current" />
                                  編集
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDelete(diary.id)}
                                  className="text-destructive"
                                >
                                  <TrashIcon className="mr-2 h-4 w-4 text-current" />
                                  削除
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>

                      {/* 作業内容 */}
                      {diary.content && (
                        <div>
                          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                            {diary.content}
                          </p>
                        </div>
                      )}

                      {/* 対象ほ場 */}
                      {diary.diaryThings && diary.diaryThings.length > 0 && (
                        <div className="flex items-center gap-2">
                          <MapPinIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex flex-wrap gap-1">
                            {diary.diaryThings.map((dt, index: number) => (
                              <Badge
                                key={index}
                                variant="outline"
                                className="text-xs"
                              >
                                {dt.thing.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* メタ情報: 作成者・作成日時・更新日時 */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>作成者: {diary.userName || "未知"}</span>
                        <div className="flex items-center gap-2">
                          <span>
                            作成:{" "}
                            {format(new Date(diary.createdAt), "MM/dd HH:mm")}
                          </span>
                          {format(
                            new Date(diary.createdAt),
                            "yyyy-MM-dd HH:mm"
                          ) !==
                            format(
                              new Date(diary.updatedAt),
                              "yyyy-MM-dd HH:mm"
                            ) && (
                            <span>
                              更新:{" "}
                              {format(new Date(diary.updatedAt), "MM/dd HH:mm")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">この日の日誌はありません</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
