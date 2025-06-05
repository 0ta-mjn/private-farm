"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { useOrganization } from "@/contexts/organization-context";
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
import { Separator } from "@/shadcn/separator";
import { Badge } from "@/shadcn/badge";
import {
  BuildingIcon,
  SaveIcon,
  UsersIcon,
  CalendarIcon,
  ShieldIcon,
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
  React.useEffect(() => {
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

  if (!currentOrganizationId) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <BuildingIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">
                組織が選択されていません
              </h3>
              <p className="text-muted-foreground">
                サイドバーから組織を選択してください。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
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
    <div className="container mx-auto py-8 space-y-6">
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
    </div>
  );
}
