"use client";

import React, { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/shadcn/command";
import { Badge } from "@/shadcn/badge";
import { Skeleton } from "@/shadcn/skeleton";
import { CalendarIcon, MapPinIcon } from "lucide-react";
import { getWeatherDisplay } from "@/constants/agricultural-constants";
import { cn } from "@/lib/utils";
import { RouterOutputs } from "@repo/api";
import { DiaryWorkTypeChip } from "@/components/diary/diary-work-type-chip";
import { ThingFilter, ThingFilterValue } from "@/components/thing/thing-filter";
import { WorkTypeFilter } from "@/components/diary/work-type-filter";

interface DiarySearchProps {
  onDiarySelect?: (
    diary: RouterOutputs["diary"]["search"]["diaries"][number]
  ) => void;
  currentUserId: string;
  organizationId: string;
  className?: string;
}

interface DiarySearchListProps {
  searchQuery: string;
  currentUserId: string;
  onDiarySelect: (
    diary: RouterOutputs["diary"]["search"]["diaries"][number]
  ) => void;
  organizationId: string;
  workType?: string | null;
  thingId?: string | null;
}

function DiarySearchList({
  searchQuery,
  currentUserId,
  onDiarySelect,
  organizationId,
  workType,
  thingId,
}: DiarySearchListProps) {
  const trpc = useTRPC();

  // 検索結果を取得
  const diariesQuery = useQuery(
    trpc.diary.search.queryOptions(
      {
        organizationId,
        offset: 0,
        limit: 20, // インライン表示なので20件まで
        workTypes: workType ? [workType] : undefined,
        thingIds: thingId ? [thingId] : undefined,
        search: searchQuery || undefined,
      },
      {
        staleTime: 5 * 60 * 1000, // 5分間キャッシュ
      }
    )
  );

  const diaries = diariesQuery.data?.diaries || [];

  // ローディング中はスケルトンを表示
  if (diariesQuery.isLoading) {
    return (
      <CommandGroup heading="検索中...">
        <div className="flex flex-col items-start gap-2 p-3">
          <div className="w-full">
            {/* ヘッダースケルトン */}
            <div className="flex items-center gap-2 mb-1">
              <Skeleton className="h-3 w-3 rounded" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-12 rounded-md" />
              <Skeleton className="h-5 w-16 rounded-md" />
            </div>

            {/* タイトルスケルトン */}
            <Skeleton className="h-4 w-3/4 mb-1" />

            {/* 内容スケルトン */}
            <Skeleton className="h-3 w-full mb-2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      </CommandGroup>
    );
  }

  return (
    <>
      <CommandEmpty>該当する日誌が見つかりません</CommandEmpty>
      {diaries.length > 0 && (
        <CommandGroup>
          {diaries.map((diary) => {
            const weatherDisplay = getWeatherDisplay(diary.weather);

            return (
              <CommandItem
                key={diary.id}
                value={diary.id}
                onSelect={() => onDiarySelect(diary)}
                className="flex flex-col items-start gap-2 p-3 cursor-pointer hover:bg-accent"
              >
                <div className="w-full">
                  {/* ヘッダー */}
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CalendarIcon className="h-3 w-3" />
                      <span>
                        {format(new Date(diary.date), "M/d(E)", {
                          locale: ja,
                        })}
                      </span>

                      {weatherDisplay && (
                        <div className="text-xs h-5">
                          {weatherDisplay.icon || weatherDisplay.label}
                          {diary.temperature && ` ${diary.temperature}°C`}
                        </div>
                      )}

                      <DiaryWorkTypeChip workType={diary.workType} />

                      {diary.diaryThings && diary.diaryThings.length > 0 && (
                        <Badge variant="outline" className="text-xs h-5">
                          <MapPinIcon className="h-2.5 w-2.5 mr-1" />
                          {diary.diaryThings.length}件
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* タイトル */}
                  {diary.title && (
                    <h4 className="font-medium text-sm mb-1 line-clamp-1">
                      {diary.title}
                    </h4>
                  )}

                  {/* 内容 */}
                  {diary.content && (
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                      {diary.content}
                    </p>
                  )}

                  {/* 作成者 */}
                  {diary.userName && diary.userId !== currentUserId && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {diary.userName}
                    </div>
                  )}
                </div>
              </CommandItem>
            );
          })}
        </CommandGroup>
      )}
    </>
  );
}

export function DiarySearch({
  onDiarySelect,
  currentUserId,
  organizationId,
  className,
}: DiarySearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [workTypeFilter, setWorkTypeFilter] = useState<string | null>(null);
  const [thingFilter, setThingFilter] = useState<ThingFilterValue | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const insideRefSet = useRef<Set<HTMLElement>>(new Set());

  // 外部クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // クリックされた要素がCommand内にあるかチェック
      const isInsideCommand = Array.from(insideRefSet.current).some((ref) =>
        ref.contains(target)
      );
      if (!isInsideCommand) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDiarySelect = (
    diary: RouterOutputs["diary"]["search"]["diaries"][number]
  ) => {
    onDiarySelect?.(diary);
    setIsOpen(false);
    setSearchQuery(""); // 選択後にクリア
    inputRef.current?.blur(); // フォーカスを外す
  };

  return (
    <div
      ref={(commandRef) => {
        if (commandRef) {
          insideRefSet.current.add(commandRef);
        }
      }}
      className={cn("relative min-w-md", className)}
    >
      <Command className="border focus:shadow-sm">
        <CommandInput
          ref={inputRef}
          placeholder="日誌を検索..."
          value={searchQuery}
          onValueChange={setSearchQuery}
          onFocus={() => {
            setIsOpen(true);
          }}
        />

        {/* 検索結果のドロップダウン */}
        {isOpen && (
          <CommandList>
            <div className="absolute top-full left-0 right-0 z-50 bg-background shadow-lg max-h-96 space-y-2 overflow-hidden p-2">
              <div className="w-full flex items-center gap-2">
                <ThingFilter
                  organizationId={organizationId}
                  value={thingFilter}
                  onChange={setThingFilter}
                  size="sm"
                  contentRef={(e) => {
                    if (e) {
                      insideRefSet.current.add(e);
                    }
                  }}
                />
                <WorkTypeFilter
                  value={workTypeFilter}
                  onChange={setWorkTypeFilter}
                  size="sm"
                  contentRef={(e) => {
                    if (e) {
                      insideRefSet.current.add(e);
                    }
                  }}
                />
              </div>

              <DiarySearchList
                organizationId={organizationId}
                searchQuery={searchQuery}
                currentUserId={currentUserId}
                workType={workTypeFilter}
                thingId={thingFilter?.id || null}
                onDiarySelect={handleDiarySelect}
              />
            </div>
          </CommandList>
        )}
      </Command>
    </div>
  );
}
