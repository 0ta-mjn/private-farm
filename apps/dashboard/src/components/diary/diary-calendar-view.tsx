"use client";

import React, { useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  isSameMonth,
  getDay,
} from "date-fns";
import { ja } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/shadcn/card";
import { Badge } from "@/shadcn/badge";
import { Button } from "@/shadcn/button";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { WORK_TYPE_OPTIONS, type WorkTypeKey } from "@repo/config";

// tRPCの型定義を利用 - 月の日誌サマリーの配列型
type DiaryMonthSummaryData = Array<{
  id: string;
  date: string;
  weather: string | null;
  workType: string | null;
  fields: Array<{
    id: string;
    name: string;
  }>;
}>;

interface DiaryCalendarViewProps {
  currentMonth: Date;
  selectedDate: Date | null;
  diaries: DiaryMonthSummaryData;
  onMonthChange: (direction: "prev" | "next") => void;
  onDateSelect: (date: Date) => void;
}

interface DiaryByDate {
  [key: string]: DiaryMonthSummaryData[number][];
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

// 作業種別の表示テキストを取得するヘルパー関数
const getWorkTypeDisplay = (workType: string | null | undefined): string => {
  if (!workType) return "未分類";
  return WORK_TYPE_OPTIONS[workType as WorkTypeKey] || workType;
};

export function DiaryCalendarView({
  currentMonth,
  selectedDate,
  diaries,
  onMonthChange,
  onDateSelect,
}: DiaryCalendarViewProps) {
  // 日誌を日付別にグループ化
  const diariesByDate = useMemo(() => {
    const grouped: DiaryByDate = {};
    diaries.forEach((diary) => {
      const dateKey = format(new Date(diary.date), "yyyy-MM-dd");
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(diary);
    });
    return grouped;
  }, [diaries]);

  // カレンダーの日付データを生成
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = new Date(monthStart);
    const endDate = new Date(monthEnd);

    // 月初の曜日調整（日曜日から開始）
    const startDay = getDay(startDate);
    startDate.setDate(startDate.getDate() - startDay);

    // 月末の曜日調整（土曜日まで）
    const endDay = getDay(endDate);
    endDate.setDate(endDate.getDate() + (6 - endDay));

    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  const handlePrevMonth = () => {
    onMonthChange("prev");
  };

  const handleNextMonth = () => {
    onMonthChange("next");
  };

  const isCurrentMonth = (date: Date) => {
    return isSameMonth(date, currentMonth);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            {format(currentMonth, "yyyy年 M月", { locale: ja })}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevMonth}
              className="h-8 w-8 p-0"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextMonth}
              className="h-8 w-8 p-0"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full">
          {/* 曜日ヘッダー */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map((day, index) => (
              <div
                key={day}
                className={cn(
                  "text-center text-sm font-medium py-2",
                  index === 0
                    ? "text-red-500"
                    : index === 6
                      ? "text-blue-500"
                      : "text-muted-foreground"
                )}
              >
                {day}
              </div>
            ))}
          </div>

          {/* カレンダーグリッド */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date, index) => {
              const dateKey = format(date, "yyyy-MM-dd");
              const dayDiaries = diariesByDate[dateKey] || [];
              const isSelected = selectedDate
                ? isSameDay(date, selectedDate)
                : false;
              const isTodayDate = isToday(date);
              const isInCurrentMonth = isCurrentMonth(date);

              return (
                <div
                  key={index}
                  className={cn(
                    "min-h-[80px] p-1 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50",
                    isTodayDate && "bg-primary/20 border-primary",
                    isSelected && "bg-accent/20 border-accent",
                    !isInCurrentMonth && "opacity-40"
                  )}
                  onClick={() => onDateSelect(date)}
                >
                  <div className="space-y-1">
                    {/* 日付 */}
                    <div
                      className={cn(
                        "text-sm font-medium text-center",
                        !isInCurrentMonth && "text-muted-foreground",
                        isTodayDate && "text-primary font-bold",
                        isSelected && "text-accent font-bold"
                      )}
                    >
                      {format(date, "d")}
                    </div>

                    {/* 作業種別バッジ */}
                    {dayDiaries.length > 0 && (
                      <div className="space-y-1">
                        {dayDiaries.slice(0, 2).map((diary, diaryIndex) => (
                          <Badge
                            key={diaryIndex}
                            variant="secondary"
                            className="text-xs w-full justify-center truncate"
                            style={{ fontSize: "10px", padding: "1px 4px" }}
                          >
                            {getWorkTypeDisplay(diary.workType)}
                          </Badge>
                        ))}
                        {dayDiaries.length > 2 && (
                          <div className="text-xs text-center text-muted-foreground">
                            +{dayDiaries.length - 2}件
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
