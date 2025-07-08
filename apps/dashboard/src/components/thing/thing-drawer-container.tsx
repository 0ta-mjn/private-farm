"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client } from "@/rpc/client";
import { things } from "@/rpc/factory";
import {
  useThingDrawerState,
  useThingDrawerActions,
} from "@/contexts/thing-drawer-context";
import { ThingFormDrawer, type ThingFormData } from "./thing-form-drawer";
import { toast } from "sonner";

interface ThingDrawerContainerProps {
  organizationId: string;
}

export function ThingDrawerContainer({
  organizationId: currentOrganizationId,
}: ThingDrawerContainerProps) {
  // コンテキストとクライアント
  const state = useThingDrawerState();
  const actions = useThingDrawerActions();
  const queryClient = useQueryClient();

  const open = state.createOpen || state.editOpen;
  const isEdit = state.editOpen;
  const thingId = state.editId;

  // 区画の詳細データを取得（編集モードの場合）
  const { data: thingData, isLoading: isLoadingThing } = useQuery({
    ...things.detail(currentOrganizationId || "", thingId || ""),
    enabled: isEdit && !!thingId && !!currentOrganizationId,
  });

  // 作成 mutation
  const createThingMutation = useMutation({
    mutationFn: async (params: {
      organizationId: string;
      name: string;
      type: string;
      description: string;
      location: string;
      area: number | null;
    }) =>
      client.thing.create[":organizationId"].$post({
        param: { organizationId: params.organizationId },
        json: {
          organizationId: params.organizationId,
          name: params.name,
          type: params.type,
          description: params.description,
          location: params.location,
          area: params.area,
        },
      }),
    onSuccess: (newThing, { organizationId }) => {
      toast.success("区画が正常に作成されました", {
        description: `「${newThing.name}」が作成されました。`,
      });

      // 区画一覧のキャッシュを無効化
      queryClient.invalidateQueries({
        queryKey: things.list(organizationId).queryKey,
      });

      actions.closeAll();
    },
    onError: (error: Error) => {
      console.error("Failed to create thing:", error);
      const errorMessage =
        error?.message || "区画の作成中にエラーが発生しました";
      toast.error("区画の作成に失敗しました", {
        description: errorMessage,
      });
    },
  });

  // 更新 mutation
  const updateThingMutation = useMutation({
    mutationFn: async (params: {
      thingId: string;
      organizationId: string;
      name: string;
      type: string;
      description: string;
      location: string;
      area: number | null;
    }) =>
      client.thing.update[":organizationId"][":thingId"].$put({
        param: {
          organizationId: params.organizationId,
          thingId: params.thingId,
        },
        json: {
          name: params.name,
          type: params.type,
          description: params.description,
          location: params.location,
          area: params.area,
        },
      }),
    onSuccess: (updatedThing, { thingId, organizationId }) => {
      toast.success("区画が正常に更新されました", {
        description: `「${updatedThing.name}」が更新されました。`,
      });

      // 区画一覧と詳細のキャッシュを無効化
      queryClient.invalidateQueries({
        queryKey: things.list(organizationId).queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: things.detail(organizationId, thingId).queryKey,
      });

      actions.closeAll();
    },
    onError: (error: Error) => {
      console.error("Failed to update thing:", error);
      const errorMessage =
        error?.message || "区画の更新中にエラーが発生しました";
      toast.error("区画の更新に失敗しました", {
        description: errorMessage,
      });
    },
  });

  // 初期データの準備
  const initialData: ThingFormData | undefined =
    isEdit && thingData && !isLoadingThing
      ? {
          name: thingData.name || "",
          type: thingData.type || "",
          description: thingData.description || "",
          location: thingData.location || "",
          area: thingData.area ? thingData.area.toString() : "",
        }
      : undefined;

  const handleSubmit = async (data: ThingFormData) => {
    if (!currentOrganizationId) {
      console.error("Organization ID is required");
      toast.error("組織が選択されていません");
      return;
    }

    try {
      // 面積の変換（文字列から数値へ）
      const area = data.area && data.area !== "" ? parseFloat(data.area) : null;

      const formData = {
        organizationId: currentOrganizationId,
        name: data.name,
        type: data.type,
        description: data.description || "",
        location: data.location || "",
        area,
      };

      if (isEdit && thingId) {
        // 更新処理
        updateThingMutation.mutate({
          thingId,
          ...formData,
        });
      } else {
        // 作成処理
        createThingMutation.mutate(formData);
      }
    } catch (error) {
      console.error("Failed to save thing:", error);
    }
  };

  const handleClose = () => {
    actions.closeAll();
  };

  // ローディング中は何も表示しない
  if (isEdit && !thingData) {
    return null;
  }

  return (
    <ThingFormDrawer
      open={open}
      onClose={handleClose}
      isEdit={isEdit}
      isSubmitting={
        createThingMutation.isPending || updateThingMutation.isPending
      }
      initialData={initialData}
      onSubmit={handleSubmit}
    />
  );
}
