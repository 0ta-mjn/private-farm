"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  format,
  isSameMonth,
  addMonths,
  subMonths,
  parse,
  isValid,
} from "date-fns";
import { Card, CardContent } from "@/shadcn/card";
import { DiaryDateDetail } from "./diary-date-detail";
import { CalendarGrid } from "./calendar-grid";
import { useTRPC } from "@/trpc/client";

interface DiaryCalendarViewProps {
  organizationId: string;
  onEdit?: (diaryId: string) => void;
  onDelete?: (diaryId: string) => void;
  currentUserId: string;
}

export function DiaryCalendarView({
  organizationId,
  onEdit,
  onDelete,
  currentUserId,
}: DiaryCalendarViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const trpc = useTRPC();

  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // 月のサマリーデータを取得（カレンダー表示用）
  const monthSummaryQuery = useQuery(
    trpc.diary.byMonth.queryOptions(
      {
        organizationId,
        year: currentMonth.getFullYear(),
        month: currentMonth.getMonth() + 1,
      },
      {
        enabled: !!organizationId,
        staleTime: 5 * 60 * 1000, // 5分間キャッシュ
      }
    )
  );

  // データはそのまま使用（変換不要）
  const diaries = monthSummaryQuery.data || [];

  // URLパラメータを更新するヘルパー関数
  const updateUrlParams = useCallback(
    (newMonth?: Date | null, newSelectedDate?: Date | null) => {
      const params = new URLSearchParams(searchParams.toString());

      // 新しい月が指定された場合
      if (newMonth !== undefined) {
        if (newMonth) {
          params.set("month", format(newMonth, "yyyy-MM"));
        } else {
          params.delete("month");
        }
      }

      // 新しい選択日が指定された場合
      if (newSelectedDate !== undefined) {
        if (newSelectedDate) {
          params.set("date", format(newSelectedDate, "yyyy-MM-dd"));
          // 日付が指定された場合は自動的に月も設定
          params.set("month", format(newSelectedDate, "yyyy-MM"));
        } else {
          params.delete("date");
        }
      }

      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  // URLパラメータの変更を監視して状態を同期、初期化も行う
  useEffect(() => {
    const monthParam = searchParams.get("month");
    const dateParam = searchParams.get("date");

    // 初期値の設定
    let initialMonth = new Date();
    let initialDate = new Date();

    if (monthParam) {
      const parsedMonth = parse(monthParam, "yyyy-MM", new Date());
      if (isValid(parsedMonth)) {
        initialMonth = parsedMonth;
      }
    }

    if (dateParam) {
      const parsedDate = parse(dateParam, "yyyy-MM-dd", new Date());
      if (isValid(parsedDate)) {
        initialDate = parsedDate;
      }
    }

    setCurrentMonth(initialMonth);
    setSelectedDate(initialDate);

    // dateクエリが指定されていてmonthがないか異なる月が指定されている場合のみクエリを更新
    if (dateParam && initialDate) {
      const selectedMonth = format(initialDate, "yyyy-MM");
      if (!monthParam || monthParam !== selectedMonth) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("month", selectedMonth);
        router.replace(`?${params.toString()}`, { scroll: false });
      }
    }
  }, [searchParams, router]);

  const handleMonthChange = (direction: "prev" | "next") => {
    const newMonth =
      direction === "prev"
        ? subMonths(currentMonth, 1)
        : addMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    setSelectedDate(null); // 月変更時は選択日をクリア
    updateUrlParams(newMonth, null); // 月を更新し、日付をクリア
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    // 選択された日付に基づいて月も更新
    if (!isSameMonth(date, currentMonth)) {
      setCurrentMonth(date);
    }
    updateUrlParams(undefined, date); // 日付のみ更新（月は自動的に設定される）
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* カレンダー部分 */}
      <div className="lg:col-span-2">
        <CalendarGrid
          currentMonth={currentMonth}
          selectedDate={selectedDate}
          diaries={diaries}
          onMonthChange={handleMonthChange}
          onDateSelect={handleDateClick}
        />
      </div>

      {/* 選択した日付の日誌一覧 */}
      {selectedDate ? (
        <DiaryDateDetail
          selectedDate={selectedDate}
          organizationId={organizationId}
          onEdit={onEdit}
          onDelete={onDelete}
          currentUserId={currentUserId}
        />
      ) : (
        <Card className="w-full">
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
        </Card>
      )}
    </div>
  );
}
