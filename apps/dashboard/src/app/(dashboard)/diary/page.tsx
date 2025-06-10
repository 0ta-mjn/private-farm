"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  Suspense,
  useMemo,
} from "react";
import { useUserId } from "@/lib/auth-context";
import { useOrganization } from "@/contexts/organization-context";
import { useDiaryDrawerActions } from "@/contexts/diary-drawer-context";
import { Button } from "@/shadcn/button";
import { PlusIcon } from "lucide-react";
import { DiarySearch } from "@/components/diary/diary-search";
import { DeleteDiaryDialog } from "@/components/diary/delete-diary-dialog";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  format,
  isSameMonth,
  addMonths,
  subMonths,
  parse,
  isValid,
} from "date-fns";
import { DiaryDateDetail } from "@/components/diary/diary-date-detail";
import { DiaryCalendarView } from "@/components/diary/diary-calendar-view";
import { useTRPC } from "@/trpc/client";
import { useMediaQuery } from "@/hooks/use-mobile";

function DiaryPageContent() {
  const actions = useDiaryDrawerActions();
  const userId = useUserId();
  const { currentOrganizationId } = useOrganization();
  const router = useRouter();
  const searchParams = useSearchParams();
  const trpc = useTRPC();

  // 状態管理
  const [deletingDiaryId, setDeletingDiaryId] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // 月のサマリーデータを取得（カレンダー表示用）
  const monthSummaryQuery = useQuery(
    trpc.diary.byMonth.queryOptions(
      {
        organizationId: currentOrganizationId || "",
        year: currentMonth.getFullYear(),
        month: currentMonth.getMonth() + 1,
      },
      {
        enabled: !!currentOrganizationId,
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

  const selectedDate = useMemo(() => {
    const dateParam = searchParams.get("date");
    if (dateParam) {
      const parsedDate = parse(dateParam, "yyyy-MM-dd", new Date());
      return isValid(parsedDate) ? parsedDate : null;
    }
    return null;
  }, [searchParams]);

  // URLパラメータの変更を監視して状態を同期、初期化も行う
  useEffect(() => {
    const dateParam = searchParams.get("date");
    const monthParam = searchParams.get("month");

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
    updateUrlParams(newMonth, null); // 月を更新し、日付をクリア
  };

  const handleDateClick = (date: Date | null) => {
    // 選択された日付に基づいて月も更新
    if (date && !isSameMonth(date, currentMonth)) {
      setCurrentMonth(date);
    }
    updateUrlParams(undefined, date); // 日付のみ更新（月は自動的に設定される）
  };

  // イベントハンドラー
  const handleDiaryClick = (diary: { date: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", diary.date);
    params.set("month", diary.date.slice(0, 7)); // yyyy-MM形式に変換
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const handleEdit = (diaryId: string) => {
    actions.openEdit(diaryId);
  };

  const handleDelete = (diaryId: string) => {
    setDeletingDiaryId(diaryId);
  };

  const isDrawer = useMediaQuery("(max-width: 1024px)");

  if (!userId) return null; // ユーザーが未ログインの場合は何も表示しない

  // 組織が選択されていない場合の表示
  if (!currentOrganizationId) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">組織を選択してください</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto pb-6">
      {/* ヘッダー */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <DiarySearch onDiarySelect={handleDiaryClick} currentUserId={userId} />

        <Button onClick={actions.openCreate}>
          <PlusIcon className="h-4 w-4 mr-2" />
          新規作成
        </Button>
      </div>

      {/* メインコンテンツ - カレンダー表示 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-6">
        {/* カレンダー部分 */}
        <div className="col-span-2">
          <DiaryCalendarView
            currentMonth={currentMonth}
            selectedDate={selectedDate}
            diaries={diaries}
            onMonthChange={handleMonthChange}
            onDateSelect={handleDateClick}
          />
        </div>

        {/* 選択した日付の日誌一覧 */}
        <div>
          <DiaryDateDetail
            selectedDate={selectedDate}
            organizationId={currentOrganizationId}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onClose={() => handleDateClick(null)}
            currentUserId={userId}
            isDrawer={isDrawer}
          />
        </div>
      </div>

      {/* 削除確認ダイアログ */}
      <DeleteDiaryDialog
        diaryId={deletingDiaryId}
        organizationId={currentOrganizationId || ""}
        onClose={() => setDeletingDiaryId(null)}
      />
    </div>
  );
}

export default function DiaryPage() {
  return (
    <Suspense>
      <DiaryPageContent />
    </Suspense>
  );
}
