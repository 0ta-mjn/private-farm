"use client";

import React from "react";
import { DiaryCardData } from "./diary-card";
import { DiaryCard } from "./diary-card";

interface DiaryListViewProps {
  diaries: DiaryCardData[];
  onEdit?: (diaryId: string) => void;
  onDelete?: (diaryId: string) => void;
  onCardClick?: (diaryId: string) => void;
  currentUserId: string;
  loading?: boolean;
}

export function DiaryListView({
  diaries,
  onEdit,
  onDelete,
  onCardClick,
  currentUserId,
  loading = false,
}: DiaryListViewProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-48 bg-muted rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  if (diaries.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground">
          <p className="text-lg mb-2">日誌がありません</p>
          <p className="text-sm">
            「新規作成」ボタンから最初の日誌を作成してみてください
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {diaries.map((diary) => (
        <DiaryCard
          key={diary.id}
          diary={diary}
          onEdit={onEdit}
          onDelete={onDelete}
          onCardClick={onCardClick}
          isCurrentUser={diary.userId === currentUserId}
        />
      ))}
    </div>
  );
}
