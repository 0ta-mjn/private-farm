"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { useOrganization } from "@/contexts/organization-context";
import { toast } from "sonner";
import { DeleteOrganizationDialog } from "@/components/organization/delete-organization-dialog";
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
import { Separator } from "@/shadcn/separator";
import { Badge } from "@/shadcn/badge";
import { Skeleton } from "@/shadcn/skeleton";
import {
  BuildingIcon,
  SaveIcon,
  UsersIcon,
  CalendarIcon,
  ShieldIcon,
  TrashIcon,
} from "lucide-react";

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

export default function OrganizationSettingsPage() {
  const { currentOrganizationId } = useOrganization();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // 削除ダイヤログの状態管理
  const [deleteDialogOrganizationId, setDeleteDialogOrganizationId] = useState<
    string | null
  >(null);

  // 現在の組織情報を取得
  const { data: organization, isLoading } = useQuery({
    ...trpc.organization.getById.queryOptions({
      organizationId: currentOrganizationId || "",
    }),
    enabled: !!currentOrganizationId,
  });

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
  const updateOrganizationMutation = useMutation(
    trpc.organization.update.mutationOptions({
      onSuccess: (updatedOrganization) => {
        toast.success("組織情報が正常に更新されました", {
          description: `「${updatedOrganization.name}」の情報を更新しました。`,
        });

        // キャッシュを無効化して最新データを取得
        queryClient.invalidateQueries({
          queryKey: trpc.organization.getById.queryKey({
            organizationId: currentOrganizationId || "",
          }),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.user.sidebarData.queryKey(),
        });
      },
      onError: (error) => {
        console.error("Organization update error:", error);
        const errorMessage =
          error?.message || "組織情報の更新中にエラーが発生しました";

        toast.error("組織情報の更新に失敗しました", {
          description: errorMessage,
        });
      },
    })
  );

  const onSubmit = (data: UpdateOrganizationFormValues) => {
    if (!currentOrganizationId) {
      toast.error("組織が選択されていません");
      return;
    }

    updateOrganizationMutation.mutate({
      organizationId: currentOrganizationId,
      ...data,
    });
  };

  const isSubmitting = updateOrganizationMutation.isPending;

  if (isLoading || !currentOrganizationId) {
    return (
      <div className="container mx-auto py-8">
        <div className="space-y-6">
          {/* ページヘッダーのスケルトン */}
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-80" />
          </div>

          <Separator />

          {/* 基本情報カードのスケルトン */}
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
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="container mx-auto py-8">
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
      </div>
    );
  }

  return (
    <div className="container mx-auto pb-8 space-y-6">
      {/* ページヘッダー */}
      <div>
        <h1 className="text-3xl font-bold">組織設定</h1>
        <p className="text-muted-foreground">組織の基本情報を管理します。</p>
      </div>

      <Separator />

      {/* 基本情報 */}
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
                <Button type="submit" disabled={isSubmitting}>
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

      {/* 組織詳細情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5" />
            組織詳細
          </CardTitle>
          <CardDescription>組織の詳細情報を確認できます。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground">
                  組織ID
                </h4>
                <p className="font-mono text-sm bg-muted px-2 py-1 rounded">
                  {organization.id}
                </p>
              </div>

              <div>
                <h4 className="font-medium text-sm text-muted-foreground">
                  作成日
                </h4>
                <p className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {new Date(organization.createdAt).toLocaleDateString(
                    "ja-JP",
                    {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }
                  )}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground">
                  あなたの権限
                </h4>
                <div className="flex items-center gap-2">
                  <ShieldIcon className="h-4 w-4" />
                  <Badge
                    variant={
                      organization.role === "admin" ? "default" : "secondary"
                    }
                  >
                    {organization.role === "admin" ? "管理者" : "メンバー"}
                  </Badge>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-sm text-muted-foreground">
                  最終更新
                </h4>
                <p className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {new Date(organization.updatedAt).toLocaleDateString(
                    "ja-JP",
                    {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }
                  )}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 危険ゾーン */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <TrashIcon className="h-5 w-5" />
            危険ゾーン
          </CardTitle>
          <CardDescription>
            組織を削除すると、すべてのデータが永久に失われます。この操作は取り消すことができません。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
              <div className="flex items-start gap-3">
                <ShieldIcon className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h4 className="font-medium text-destructive">
                    組織の削除について
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• 組織に関連するすべてのデータが削除されます</li>
                    <li>• 区画、活動記録、メンバーの情報がすべて失われます</li>
                    <li>• この操作は取り消すことができません</li>
                    <li>• 削除後はアクセスできなくなります</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                variant="destructive"
                onClick={() =>
                  setDeleteDialogOrganizationId(currentOrganizationId)
                }
                disabled={!currentOrganizationId}
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                組織を削除
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 削除確認ダイヤログ */}
      <DeleteOrganizationDialog
        organizationId={deleteDialogOrganizationId}
        organizationName={organization?.name}
        onClose={() => setDeleteDialogOrganizationId(null)}
      />
    </div>
  );
}
