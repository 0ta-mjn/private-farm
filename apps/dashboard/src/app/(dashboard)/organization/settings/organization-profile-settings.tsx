"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client } from "@/rpc/client";
import { users, organizations } from "@/rpc/factory";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shadcn/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shadcn/form";
import { Input } from "@/shadcn/input";
import { Textarea } from "@/shadcn/textarea";
import { Button } from "@/shadcn/button";
import { BuildingIcon, SaveIcon } from "lucide-react";
import { Skeleton } from "@/shadcn/skeleton";

// バリデーションスキーマ
const UpdateOrganizationSchema = z.object({
  name: z
    .string()
    .min(1, "組織名は必須です")
    .max(100, "組織名は100文字以内で入力してください"),
  description: z
    .string()
    .max(500, "説明は500文字以内で入力してください")
    .optional(),
});

type UpdateOrganizationFormValues = z.infer<typeof UpdateOrganizationSchema>;

interface OrganizationProfileSettingsProps {
  organizationId: string;
}

export function OrganizationProfileSettings({
  organizationId,
}: OrganizationProfileSettingsProps) {
  const queryClient = useQueryClient();
  const { data: organization, isLoading } = useQuery(
    organizations.detail(organizationId)
  );

  // フォームの設定
  const form = useForm<UpdateOrganizationFormValues>({
    resolver: zodResolver(UpdateOrganizationSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // フォームにデータを設定
  useEffect(() => {
    if (organization) {
      form.reset({
        name: organization.name,
        description: organization.description || "",
      });
    }
  }, [organization, form]);

  // 組織更新のmutation
  const updateOrganizationMutation = useMutation({
    mutationFn: async (
      data: UpdateOrganizationFormValues & { organizationId: string }
    ) => {
      return client.organization.update[":organizationId"].$put({
        param: { organizationId: data.organizationId },
        json: {
          name: data.name,
          description: data.description,
        },
      });
    },
    onSuccess: (updatedOrganization) => {
      toast.success("組織情報が正常に更新されました", {
        description: `「${updatedOrganization.name}」の情報を更新しました。`,
      });

      // キャッシュを無効化して最新データを取得
      queryClient.invalidateQueries(
        organizations.detail(updatedOrganization.id)
      );
      queryClient.invalidateQueries(users.sidebarData());
    },
    onError: (error) => {
      console.error("Organization update error:", error);
      const errorMessage =
        error?.message || "組織情報の更新中にエラーが発生しました";

      toast.error("組織情報の更新に失敗しました", {
        description: errorMessage,
      });
    },
  });

  const onSubmit = (data: UpdateOrganizationFormValues) => {
    updateOrganizationMutation.mutate({
      organizationId,
      ...data,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* 組織名区画 */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-3 w-48" />
            </div>

            {/* 説明区画 */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-20 w-full rounded-md" />
              <Skeleton className="h-3 w-56" />
            </div>

            {/* ボタン */}
            <div className="flex justify-end">
              <Skeleton className="h-10 w-32 rounded-md" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!organization) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <BuildingIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold">組織が見つかりません</h3>
            <p className="text-muted-foreground">
              指定された組織にアクセスできません。
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isSubmitting = updateOrganizationMutation.isPending;
  const isNotChanged =
    organization?.name === form.watch("name") &&
    organization?.description === form.watch("description");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BuildingIcon className="h-5 w-5" />
          基本情報
        </CardTitle>
        <CardDescription>組織名と説明を編集できます。</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>組織名 *</FormLabel>
                  <FormControl>
                    <Input placeholder="組織名を入力" {...field} />
                  </FormControl>
                  <FormDescription>
                    組織の名前を入力してください（1〜100文字）
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>説明</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="組織の説明を入力（任意）"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    組織の説明や目的を入力してください（500文字以内）
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting || isNotChanged}>
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                    更新中...
                  </>
                ) : (
                  <>
                    <SaveIcon className="h-4 w-4 mr-2" />
                    変更を保存
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
