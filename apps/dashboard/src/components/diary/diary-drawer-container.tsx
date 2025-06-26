"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { client } from "@/rpc/client";
import { things, diaries } from "@/rpc/factory";
import {
  useDiaryDrawerState,
  useDiaryDrawerActions,
} from "@/contexts/diary-drawer-context";
import {
  DiaryFormDrawer,
  type DiaryFormData,
  type FieldOption,
} from "./diary-form-drawer";

interface DiaryDrawerContainerProps {
  organizationId: string;
}

export function DiaryDrawerContainer({
  organizationId: currentOrganizationId,
}: DiaryDrawerContainerProps) {
  // コンテキストとクライアント
  const state = useDiaryDrawerState();
  const actions = useDiaryDrawerActions();
  const queryClient = useQueryClient();

  const open = state.createOpen || state.editOpen;
  const isEdit = state.editOpen;
  const diaryId = state.editId;

  // thingsデータを取得してFieldOptionに変換
  const { data: thingsData, isLoading: isLoadingThings } = useQuery({
    ...things.list(currentOrganizationId || ""),
    enabled: !!currentOrganizationId,
  });

  // thingsデータをFieldOptionフォーマットに変換
  const fieldOptions: FieldOption[] =
    thingsData?.map((thing) => ({
      id: thing.id,
      name: thing.name,
      type: thing.type,
      area: thing.area || 0, // areaがnullの場合は0にする
    })) || [];

  // 日誌の詳細データを取得（編集モードの場合）
  const { data: diaryData, isLoading: isLoadingDiary } = useQuery({
    ...diaries.detail(currentOrganizationId || "", diaryId || ""),
    enabled: isEdit && !!diaryId && !!currentOrganizationId,
  });

  // 作成 mutation
  const createDiaryMutation = useMutation({
    mutationFn: async (params: {
      date: string;
      organizationId: string;
      title?: string;
      content: string;
      workType: string;
      weather: string | null;
      temperature: number | null;
      thingIds: string[];
      duration: number | null;
    }) =>
      client.diary.create[":organizationId"].$post({
        param: { organizationId: params.organizationId },
        json: {
          date: params.date,
          title: params.title || "",
          content: params.content,
          workType: params.workType,
          weather: params.weather || "",
          temperature: params.temperature,
          thingIds: params.thingIds,
          duration: params.duration || null,
        },
      }),
    onSuccess: ({ date }, { organizationId }) => {
      // 日誌一覧のキャッシュを無効化
      const dateObj = new Date(date);
      queryClient.invalidateQueries({
        queryKey: diaries.byDate(organizationId, {
          date: format(dateObj, "yyyy-MM-dd"),
        }).queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: diaries.byDateRange(organizationId, {
          startDate: format(startOfMonth(dateObj), "yyyy-MM-dd"),
          endDate: format(endOfMonth(dateObj), "yyyy-MM-dd"),
        }).queryKey,
      });
      actions.closeAll();
    },
    onError: (error: Error) => {
      console.error("Failed to create diary:", error);
      // TODO: エラートーストを表示
    },
  });

  // 更新 mutation
  const updateDiaryMutation = useMutation({
    mutationFn: async (params: {
      diaryId: string;
      date: string;
      organizationId: string;
      title?: string;
      content: string;
      workType: string;
      weather: string | null;
      temperature: number | null;
      duration: number | null;
      thingIds: string[];
    }) =>
      client.diary.update[":organizationId"][":diaryId"].$put({
        param: {
          organizationId: params.organizationId,
          diaryId: params.diaryId,
        },
        json: {
          date: params.date,
          title: params.title,
          content: params.content,
          workType: params.workType,
          weather: params.weather,
          temperature: params.temperature,
          duration: params.duration,
          thingIds: params.thingIds,
        },
      }),
    onSuccess: (_, { diaryId, organizationId, date }) => {
      // 日誌一覧と詳細のキャッシュを無効化
      const dateObj = new Date(date);
      queryClient.invalidateQueries({
        queryKey: diaries.byDate(organizationId, {
          date: format(dateObj, "yyyy-MM-dd"),
        }).queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: diaries.byDateRange(organizationId, {
          startDate: format(startOfMonth(dateObj), "yyyy-MM-dd"),
          endDate: format(endOfMonth(dateObj), "yyyy-MM-dd"),
        }).queryKey,
      });

      queryClient.invalidateQueries({
        queryKey: diaries.detail(organizationId, diaryId).queryKey,
      });
      actions.closeAll();
    },
    onError: (error: Error) => {
      console.error("Failed to update diary:", error);
      // TODO: エラートーストを表示
    },
  });

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
          duration: diaryData.duration || undefined,
        }
      : undefined;

  const handleSubmit = async (data: DiaryFormData) => {
    if (!currentOrganizationId) {
      console.error("Organization ID is required");
      return;
    }

    try {
      const formData = {
        date: format(data.date, "yyyy-MM-dd"),
        organizationId: currentOrganizationId,
        title: data.title,
        content: data.content || "",
        workType: data.workType,
        weather: data.weather || null,
        temperature: data.temperature ?? null,
        thingIds: data.thingIds || [],
        duration: data.duration ?? null,
      };

      if (isEdit && diaryId) {
        // 更新処理
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
  if ((isEdit && !diaryData) || isLoadingThings) {
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
      fieldOptions={fieldOptions}
    />
  );
}
