"use client";

import { createContext, useContext, ReactNode, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// 状態の型定義
export interface DiaryDrawerState {
  createOpen: boolean;
  editOpen: boolean;
  detailOpen: boolean;
  editId: string | null;
  detailId: string | null;
}

// アクションの型定義
export interface DiaryDrawerActions {
  openCreate: () => void;
  closeCreate: () => void;
  openEdit: (id: string) => void;
  closeEdit: () => void;
  openDetail: (id: string) => void;
  closeDetail: () => void;
  closeAll: () => void;
}

// 状態用のコンテキスト
const DiaryDrawerStateContext = createContext<DiaryDrawerState | null>(null);

// アクション用のコンテキスト
const DiaryDrawerActionsContext = createContext<DiaryDrawerActions | null>(
  null
);

interface DiaryDrawerProviderProps {
  children: ReactNode;
}

export function DiaryDrawerProvider({ children }: DiaryDrawerProviderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL パラメータから状態を取得（diary-mode と diary-id の組み合わせ）
  const mode = searchParams.get("diary-mode"); // "create" | "edit" | "detail"
  const id = searchParams.get("diary-id");

  const createOpen = mode === "create";
  const editOpen = mode === "edit" && id !== null;
  const detailOpen = mode === "detail" && id !== null;
  const editId = editOpen ? id : null;
  const detailId = detailOpen ? id : null;

  // URLパラメータを更新するヘルパー関数
  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams);

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  // アクション関数群
  const openCreate = useCallback(() => {
    updateParams({
      "diary-mode": "create",
      "diary-id": null,
    });
  }, [updateParams]);

  const openEdit = useCallback(
    (id: string) => {
      updateParams({
        "diary-mode": "edit",
        "diary-id": id,
      });
    },
    [updateParams]
  );

  const openDetail = useCallback(
    (id: string) => {
      updateParams({
        "diary-mode": "detail",
        "diary-id": id,
      });
    },
    [updateParams]
  );

  const closeAll = useCallback(() => {
    updateParams({
      "diary-mode": null,
      "diary-id": null,
    });
  }, [updateParams]);

  const closeCreate = useCallback(() => {
    updateParams({ "diary-mode": null, "diary-id": null });
  }, [updateParams]);

  const closeEdit = useCallback(() => {
    updateParams({ "diary-mode": null, "diary-id": null });
  }, [updateParams]);

  const closeDetail = useCallback(() => {
    updateParams({ "diary-mode": null, "diary-id": null });
  }, [updateParams]);

  // 状態オブジェクト
  const state: DiaryDrawerState = {
    createOpen,
    editOpen,
    detailOpen,
    editId,
    detailId,
  };

  // アクションオブジェクト
  const actions: DiaryDrawerActions = {
    openCreate,
    openEdit,
    openDetail,
    closeAll,
    closeCreate,
    closeEdit,
    closeDetail,
  };

  return (
    <DiaryDrawerStateContext.Provider value={state}>
      <DiaryDrawerActionsContext.Provider value={actions}>
        {children}
      </DiaryDrawerActionsContext.Provider>
    </DiaryDrawerStateContext.Provider>
  );
}

// 状態用のフック
export function useDiaryDrawerState() {
  const context = useContext(DiaryDrawerStateContext);
  if (!context) {
    throw new Error(
      "useDiaryDrawerState must be used within a DiaryDrawerProvider"
    );
  }
  return context;
}

// アクション用のフック
export function useDiaryDrawerActions() {
  const context = useContext(DiaryDrawerActionsContext);
  if (!context) {
    throw new Error(
      "useDiaryDrawerActions must be used within a DiaryDrawerProvider"
    );
  }
  return context;
}

// 後方互換性のための統合フック
export function useDiaryDrawerContext() {
  const state = useDiaryDrawerState();
  const actions = useDiaryDrawerActions();

  return { state, actions };
}
