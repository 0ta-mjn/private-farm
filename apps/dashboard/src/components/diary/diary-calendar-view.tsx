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
import { Button } from "@/shadcn/button";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { DiaryWorkTypeChip } from "@/components/diary/diary-work-type-chip";
import { client } from "@/rpc/client";

// の型定義を利用 - 月の日誌サマリーの配列型
type DiaryMonthSummaryData = Pick<
  Awaited<
    ReturnType<(typeof client)["diary"]["by-month"][":organizationId"]["$get"]>
  >[number],
  "id" | "date" | "workType"
>;

interface DiaryCalendarViewProps {
  currentMonth: Date;
  selectedDate: Date | null;
  diaries: DiaryMonthSummaryData[];
  onMonthChange: (direction: "prev" | "next") => void;
  onDateSelect: (date: Date) => void;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const MAX_VISIBLE_DIARIES_PER_DAY = 2;

// ユーティリティ関数を分離してテストしやすくする
export function groupDiariesByDate(diaries: DiaryMonthSummaryData[]) {
  return diaries.reduce(
    (acc, diary) => {
      const dateKey = format(new Date(diary.date), "yyyy-MM-dd");
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(diary);
      return acc;
    },
    {} as Record<string, DiaryMonthSummaryData[]>
  );
}

export function generateCalendarDays(currentMonth: Date) {
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
}

export function DiaryCalendarView({
  currentMonth,
  selectedDate,
  diaries,
  onMonthChange,
  onDateSelect,
}: DiaryCalendarViewProps) {
  // 日誌を日付別にグループ化
  const diariesByDate = useMemo(() => {
    return groupDiariesByDate(diaries);
  }, [diaries]);

  // カレンダーの日付データを生成
  const calendarDays = useMemo(() => {
    return generateCalendarDays(currentMonth);
  }, [currentMonth]);

  const handlePrevMonth = () => {
    onMonthChange("prev");
  };

  const handleNextMonth = () => {
    onMonthChange("next");
  };

  const title = format(currentMonth, "yyyy年 M月", { locale: ja });

  return (
    <div className="w-full flex flex-col gap-4" data-testid="diary-calendar">
      <div className="flex items-center justify-between">
        <h2
          className="text-lg font-semibold hidden md:block"
          data-testid="diary-calendar-title"
        >
          {title}
        </h2>

        <div className="flex w-full md:w-fit items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevMonth}
            className="h-8 w-8 p-0"
            data-testid="diary-calendar-prev-month"
            aria-label="前の月"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>

          <h2
            className="text-lg text-center font-semibold flex-1 md:hidden"
            data-testid="diary-calendar-title-mobile"
          >
            {title}
          </h2>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNextMonth}
            className="h-8 w-8 p-0"
            data-testid="diary-calendar-next-month"
            aria-label="次の月"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="w-full">
        {/* 曜日ヘッダー */}
        <div
          className="hidden md:grid grid-cols-7 gap-1 mb-2"
          data-testid="diary-calendar-weekdays"
        >
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
              data-testid={`diary-calendar-weekday-${index}`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* カレンダーグリッド */}
        <div
          className="grid grid-cols-1 md:grid-cols-7 gap-1"
          data-testid="diary-calendar-grid"
        >
          {calendarDays.map((date, index) => {
            const dateKey = format(date, "yyyy-MM-dd");
            const dayDiaries = diariesByDate[dateKey] || [];
            const isSelected = selectedDate
              ? isSameDay(date, selectedDate)
              : false;
            const isTodayDate = isToday(date);
            const isInCurrentMonth = isSameMonth(date, currentMonth);
            const day = getDay(date);

            return (
              <button
                role="button"
                tabIndex={0}
                key={index}
                className={cn(
                  "min-h-[3.5rem] md:min-h-[7.5rem] p-1 space-y-1 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50",
                  isTodayDate && "bg-primary/20 border-primary",
                  isSelected && "bg-accent/20 border-accent",
                  !isInCurrentMonth && "hidden md:block opacity-40"
                )}
                onClick={() => onDateSelect(date)}
                data-testid={`diary-calendar-day-${dateKey}`}
                data-date={dateKey}
                data-is-current-month={isInCurrentMonth}
                data-is-today={isToday(date)}
                data-is-selected={
                  selectedDate ? isSameDay(date, selectedDate) : false
                }
                data-diary-count={dayDiaries.length}
                aria-selected={
                  selectedDate ? isSameDay(date, selectedDate) : false
                }
              >
                {/* 日付 */}
                <div
                  className={cn(
                    "text-sm font-medium text-center",
                    day === 0 && "text-red-500",
                    day === 6 && "text-blue-500",
                    !isInCurrentMonth && "text-muted-foreground",
                    isTodayDate && "text-primary font-bold",
                    isSelected && "text-accent font-bold"
                  )}
                  data-testid={`diary-calendar-date-${dateKey}`}
                >
                  {format(date, "d")}
                </div>

                {/* 作業種別バッジ */}
                {dayDiaries.length > 0 && (
                  <div
                    className="flex items-center justify-center gap-1 flex-wrap"
                    data-testid={`diary-calendar-diaries-${dateKey}`}
                  >
                    {dayDiaries
                      .slice(0, MAX_VISIBLE_DIARIES_PER_DAY)
                      .map((diary, diaryIndex) => (
                        <DiaryWorkTypeChip
                          key={diary.id}
                          workType={diary.workType}
                          data-testid={`diary-calendar-diary-badge-${dateKey}-${diaryIndex}`}
                          className="max-w-full md:w-full"
                        />
                      ))}
                    {dayDiaries.length > MAX_VISIBLE_DIARIES_PER_DAY && (
                      <div
                        className="text-xs text-center text-muted-foreground"
                        data-testid={`diary-calendar-more-diaries-${dateKey}`}
                        data-remaining-count={
                          dayDiaries.length - MAX_VISIBLE_DIARIES_PER_DAY
                        }
                      >
                        +{dayDiaries.length - MAX_VISIBLE_DIARIES_PER_DAY}件
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
