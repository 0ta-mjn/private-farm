"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useTRPC } from "@/trpc/client";
import { useOrganization } from "@/contexts/organization-context";
import {
  useDiaryDrawerState,
  useDiaryDrawerActions,
} from "@/contexts/diary-drawer-context";
import {
  DiaryFormDrawer,
  type DiaryFormData,
  type FieldOption,
} from "./diary-form-drawer";

// スタブデータ：ほ場選択のオプション
const FIELD_OPTIONS: FieldOption[] = [
  { id: "field-1", name: "A区画（トマト）", type: "field", area: 100 },
  { id: "field-2", name: "B区画（きゅうり）", type: "field", area: 150 },
  { id: "field-3", name: "C区画（ナス）", type: "field", area: 80 },
  { id: "greenhouse-1", name: "第1温室", type: "greenhouse", area: 200 },
  { id: "greenhouse-2", name: "第2温室", type: "greenhouse", area: 180 },
];

export function DiaryDrawerContainer() {
  // コンテキストとtRPCクライアント
  const state = useDiaryDrawerState();
  const actions = useDiaryDrawerActions();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { currentOrganizationId } = useOrganization();

  const open = state.createOpen || state.editOpen;
  const isEdit = state.editOpen;
  const diaryId = state.editId;

  // 日誌の詳細データを取得（編集モードの場合）
  const { data: diaryData, isLoading: isLoadingDiary } = useQuery(
    trpc.diary.detail.queryOptions(
      {
        diaryId: diaryId || "",
        organizationId: currentOrganizationId || "",
      },
      {
        enabled: isEdit && !!diaryId && !!currentOrganizationId,
      }
    )
  );

  // 作成 mutation
  const createDiaryMutation = useMutation(
    trpc.diary.create.mutationOptions({
      onSuccess: () => {
        // 日誌一覧のキャッシュを無効化
        queryClient.invalidateQueries({
          queryKey: trpc.diary.list.queryKey(),
        });
        actions.closeAll();
      },
      onError: (error) => {
        console.error("Failed to create diary:", error);
        // TODO: エラートーストを表示
      },
    })
  );

  // 更新 mutation
  const updateDiaryMutation = useMutation(
    trpc.diary.update.mutationOptions({
      onSuccess: () => {
        // 日誌一覧と詳細のキャッシュを無効化
        queryClient.invalidateQueries({
          queryKey: trpc.diary.list.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.diary.detail.queryKey({ diaryId: diaryId || "" }),
        });
        actions.closeAll();
      },
      onError: (error) => {
        console.error("Failed to update diary:", error);
        // TODO: エラートーストを表示
      },
    })
  );

  // 初期データの準備
  const initialData: DiaryFormData | undefined =
    isEdit && diaryData && !isLoadingDiary
      ? {
          date: new Date(diaryData.date),
          title: diaryData.title || "",
          content: diaryData.content || "",
          workType: diaryData.workType || "",
          weather: diaryData.weather || "",
          temperature: diaryData.temperature || undefined,
          thingIds: diaryData.diaryThings?.map((item) => item.thingId) || [],
        }
      : undefined;

  const handleSubmit = async (data: DiaryFormData) => {
    if (!currentOrganizationId) {
      console.error("Organization ID is required");
      return;
    }

    try {
      const formData = {
        ...data,
        date: format(data.date, "yyyy-MM-dd"),
        organizationId: currentOrganizationId,
      };

      if (isEdit && diaryId) {
        // 更新処理
        console.log("Updating diary with ID:", diaryId);
        console.log("Form data:", formData);
        updateDiaryMutation.mutate({
          diaryId,
          ...formData,
        });
      } else {
        // 作成処理
        createDiaryMutation.mutate(formData);
      }
    } catch (error) {
      console.error("Failed to save diary:", error);
    }
  };

  const handleClose = () => {
    actions.closeAll();
  };

  // ローディング中は何も表示しない
  if (isEdit && !diaryData) {
    return null;
  }

  return (
    <DiaryFormDrawer
      open={open}
      onClose={handleClose}
      isEdit={isEdit}
      isSubmitting={
        createDiaryMutation.isPending || updateDiaryMutation.isPending
      }
      initialData={initialData}
      onSubmit={handleSubmit}
      fieldOptions={FIELD_OPTIONS}
    />
  );
}
