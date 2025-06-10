"use client";

import React from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/shadcn/card";
import { Badge } from "@/shadcn/badge";
import { Button } from "@/shadcn/button";
import { Skeleton } from "@/shadcn/skeleton";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/shadcn/drawer";
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
  getWeatherDisplay,
  getWorkTypeDisplay,
} from "@/constants/agricultural-constants";

interface DiaryDateDetailProps {
  selectedDate: Date | null;
  organizationId: string;
  onDiaryClick?: (diaryId: string) => void;
  onEdit?: (diaryId: string) => void;
  onDelete?: (diaryId: string) => void;
  onClose?: () => void;
  currentUserId?: string;
  isDrawer?: boolean;
}

export function DiaryDateDetail(props: DiaryDateDetailProps) {
  const dateTitle = (
    <div className="text-lg font-semibold flex items-center gap-2">
      <CalendarIcon className="h-5 w-5" />
      {props.selectedDate &&
        format(props.selectedDate, "M月d日(E)", { locale: ja })}
    </div>
  );

  if (props.isDrawer) {
    return (
      <Drawer open={!!props.selectedDate} onClose={props.onClose}>
        <DrawerContent className="min-h-[80vh]">
          <DrawerHeader>
            <DrawerTitle>{dateTitle}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4 overflow-y-auto">
            {props.selectedDate && (
              <DiaryDateDetailContent
                {...props}
                selectedDate={props.selectedDate}
              />
            )}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Card>
      {props.selectedDate ? (
        <>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {format(props.selectedDate, "M月d日(E)", { locale: ja })}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <DiaryDateDetailContent
              {...props}
              selectedDate={props.selectedDate}
            />
          </CardContent>
        </>
      ) : (
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="text-center text-muted-foreground">
            <div className="text-lg font-medium mb-2">
              日付を選択してください
            </div>
            <div className="text-sm">
              カレンダーから日付をクリックすると、その日の日誌が表示されます
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export function DiaryDateDetailContent({
  selectedDate,
  organizationId,
  onEdit,
  onDelete,
  currentUserId,
}: DiaryDateDetailProps & { selectedDate: Date }) {
  const trpc = useTRPC();

  // 選択した日付の日誌データをフェッチ
  const dateString = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
  const diariesQueryOptions = trpc.diary.byDate.queryOptions(
    {
      organizationId,
      date: dateString,
    },
    {
      enabled: !!organizationId && !!dateString,
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
    <>
      {isLoading ? (
        <div className="space-y-4">
          <div className="p-4 border rounded-lg">
            <div className="space-y-3">
              {/* ヘッダーのスケルトン */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-16 rounded-md" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              </div>

              {/* 作業内容のスケルトン */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-3/5" />
              </div>

              {/* 対象区画のスケルトン */}
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <div className="flex gap-1">
                  <Skeleton className="h-5 w-16 rounded-md" />
                  <Skeleton className="h-5 w-20 rounded-md" />
                </div>
              </div>

              {/* メタ情報のスケルトン */}
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-24" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : diaries.length > 0 ? (
        <div className="space-y-3">
          {diaries.map((diary) => {
            const isCurrentUser = currentUserId === diary.userId;
            const workTypeDisplay = getWorkTypeDisplay(diary.workType);
            const weatherDisplay = getWeatherDisplay(diary.weather);
            return (
              <div key={diary.id} className="p-4 border rounded-lg">
                <div className="space-y-3">
                  {/* ヘッダー: 作業種別、タイトルと操作メニュー */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {workTypeDisplay?.label || "未設定"}
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
                        {weatherDisplay && <span>{weatherDisplay.label}</span>}
                        {diary.temperature && (
                          <>
                            {weatherDisplay && <span>•</span>}
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
                              <span className="sr-only">メニューを開く</span>
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

                  {/* 対象区画 */}
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
                        作成: {format(new Date(diary.createdAt), "MM/dd HH:mm")}
                      </span>
                      {format(new Date(diary.createdAt), "yyyy-MM-dd HH:mm") !==
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
    </>
  );
}
