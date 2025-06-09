"use client";

import React from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Card, CardContent, CardHeader } from "@/shadcn/card";
import { Badge } from "@/shadcn/badge";
import { Button } from "@/shadcn/button";
import {
  CalendarIcon,
  MapPinIcon,
  MoreHorizontalIcon,
  EditIcon,
  TrashIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  WEATHER_DISPLAY_OPTIONS,
  WORK_TYPE_DISPLAY_OPTIONS,
} from "@repo/config";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shadcn/dropdown-menu";

// 日誌データの型定義（tRPCのレスポンス型に合わせる）
export interface DiaryCardData {
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
}

interface DiaryCardProps {
  diary: DiaryCardData;
  onEdit?: (diaryId: string) => void;
  onDelete?: (diaryId: string) => void;
  onCardClick?: (diaryId: string) => void;
  isCurrentUser?: boolean;
}

export function DiaryCard({
  diary,
  onEdit,
  onDelete,
  onCardClick,
  isCurrentUser = false,
}: DiaryCardProps) {
  // 日付のフォーマット
  const formattedDate = format(new Date(diary.date), "M月d日(E)", {
    locale: ja,
  });

  // 作業種別の表示名を取得
  const workTypeDisplay = diary.workType
    ? WORK_TYPE_DISPLAY_OPTIONS.find(
        (option) => option.value === diary.workType
      )?.label || diary.workType
    : "未設定";

  // 天気の表示名を取得
  const weatherDisplay = diary.weather
    ? WEATHER_DISPLAY_OPTIONS.find((option) => option.value === diary.weather)
        ?.label || diary.weather
    : null;

  // 作業内容を150文字で省略
  const truncatedContent = diary.content
    ? diary.content.length > 150
      ? `${diary.content.slice(0, 150)}...`
      : diary.content
    : "作業内容が記録されていません";

  // 対象ほ場の名前を取得
  const fieldNames = diary.diaryThings?.map((dt) => dt.thing.name) || [];

  const handleCardClick = () => {
    if (onCardClick) {
      onCardClick(diary.id);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(diary.id);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(diary.id);
    }
  };

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        "border border-border hover:border-primary/20"
      )}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{formattedDate}</span>
            {weatherDisplay && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-sm text-muted-foreground">
                  {weatherDisplay}
                </span>
              </>
            )}
            {diary.temperature && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-sm text-muted-foreground">
                  {diary.temperature}°C
                </span>
              </>
            )}
          </div>

          {isCurrentUser && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontalIcon className="h-4 w-4" />
                  <span className="sr-only">メニューを開く</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEdit}>
                  <EditIcon className="mr-2 h-4 w-4" />
                  編集
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-destructive"
                >
                  <TrashIcon className="mr-2 h-4 w-4" />
                  削除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* 作業種別 */}
          <div>
            <Badge variant="secondary" className="text-xs">
              {workTypeDisplay}
            </Badge>
          </div>

          {/* 作業内容 */}
          <div>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {truncatedContent}
            </p>
          </div>

          {/* 対象ほ場 */}
          {fieldNames.length > 0 && (
            <div className="flex items-center gap-2">
              <MapPinIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex flex-wrap gap-1">
                {fieldNames.map((name, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* メタ情報 */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <span>作成者: {diary.userName || "未知"}</span>
            <span>{format(new Date(diary.createdAt), "yyyy/MM/dd HH:mm")}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
