"use client";

import { createContext, useContext, ReactNode, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// 状態の型定義
export interface ThingDrawerState {
  createOpen: boolean;
  editOpen: boolean;
  detailOpen: boolean;
  editId: string | null;
  detailId: string | null;
}

// アクションの型定義
export interface ThingDrawerActions {
  openCreate: () => void;
  closeCreate: () => void;
  openEdit: (id: string) => void;
  closeEdit: () => void;
  closeAll: () => void;
}

// 状態用のコンテキスト
const ThingDrawerStateContext = createContext<ThingDrawerState | null>(null);

// アクション用のコンテキスト
const ThingDrawerActionsContext = createContext<ThingDrawerActions | null>(
  null
);

interface ThingDrawerProviderProps {
  children: ReactNode;
}

export function ThingDrawerProvider({ children }: ThingDrawerProviderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL パラメータから状態を取得（thing-mode と thing-id の組み合わせ）
  const mode = searchParams.get("thing-mode"); // "create" | "edit" | "detail"
  const id = searchParams.get("thing-id");

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
      "thing-mode": "create",
      "thing-id": null,
    });
  }, [updateParams]);

  const openEdit = useCallback(
    (id: string) => {
      updateParams({
        "thing-mode": "edit",
        "thing-id": id,
      });
    },
    [updateParams]
  );

  const closeAll = useCallback(() => {
    updateParams({
      "thing-mode": null,
      "thing-id": null,
    });
  }, [updateParams]);

  const closeCreate = useCallback(() => {
    updateParams({ "thing-mode": null, "thing-id": null });
  }, [updateParams]);

  const closeEdit = useCallback(() => {
    updateParams({ "thing-mode": null, "thing-id": null });
  }, [updateParams]);

  // 状態オブジェクト
  const state: ThingDrawerState = {
    createOpen,
    editOpen,
    detailOpen,
    editId,
    detailId,
  };

  // アクションオブジェクト
  const actions: ThingDrawerActions = {
    openCreate,
    openEdit,
    closeAll,
    closeCreate,
    closeEdit,
  };

  return (
    <ThingDrawerStateContext.Provider value={state}>
      <ThingDrawerActionsContext.Provider value={actions}>
        {children}
      </ThingDrawerActionsContext.Provider>
    </ThingDrawerStateContext.Provider>
  );
}

// 状態用のフック
export function useThingDrawerState() {
  const context = useContext(ThingDrawerStateContext);
  if (!context) {
    throw new Error(
      "useThingDrawerState must be used within a ThingDrawerProvider"
    );
  }
  return context;
}

// アクション用のフック
export function useThingDrawerActions() {
  const context = useContext(ThingDrawerActionsContext);
  if (!context) {
    throw new Error(
      "useThingDrawerActions must be used within a ThingDrawerProvider"
    );
  }
  return context;
}

// 後方互換性のための統合フック
export function useThingDrawerContext() {
  const state = useThingDrawerState();
  const actions = useThingDrawerActions();

  return { state, actions };
}
