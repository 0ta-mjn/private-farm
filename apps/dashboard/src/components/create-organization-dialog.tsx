"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shadcn/dialog";
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
import { useTRPC } from "@/trpc/client";
import { toast } from "sonner";
import { useOrganization } from "@/contexts/organization-context";

// バリデーションスキーマ（フロントエンド用）
const CreateOrganizationFormSchema = z.object({
  organizationName: z
    .string()
    .min(1, "組織名は必須です")
    .max(100, "組織名は100文字以内で入力してください"),
  description: z
    .string()
    .max(500, "説明は500文字以内で入力してください")
    .optional(),
});

type CreateOrganizationFormValues = z.infer<
  typeof CreateOrganizationFormSchema
>;

interface CreateOrganizationDialogProps {
  children: React.ReactNode;
}

export function CreateOrganizationDialog({
  children,
}: CreateOrganizationDialogProps) {
  const [open, setOpen] = useState(false);
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { setCurrentOrganization } = useOrganization();

  const form = useForm<CreateOrganizationFormValues>({
    resolver: zodResolver(CreateOrganizationFormSchema),
    defaultValues: {
      organizationName: "",
      description: "",
    },
  });

  // instructions.mdの正しいパターンに従ったtRPC mutation
  const createOrganizationMutation = useMutation(
    trpc.organization.create.mutationOptions({
      onSuccess: (newOrganization) => {
        toast.success("組織が正常に作成されました", {
          description: `「${newOrganization.organization.name}」が作成され、あなたが管理者として設定されました。`,
        });

        // 新しく作成された組織を現在の組織として設定
        setCurrentOrganization(newOrganization.organization.id);

        // サイドバーデータのキャッシュを無効化して最新データを取得
        queryClient.invalidateQueries({
          queryKey: trpc.user.sidebarData.queryKey(),
        });

        // 組織一覧のキャッシュも無効化
        queryClient.invalidateQueries({
          queryKey: trpc.organization.list.queryKey(),
        });

        // フォームをリセット
        form.reset();

        // ダイアログを閉じる
        setOpen(false);
      },
      onError: (error) => {
        console.error("Organization creation error:", error);

        const errorMessage =
          error?.message || "組織の作成中にエラーが発生しました";

        toast.error("組織の作成に失敗しました", {
          description: errorMessage,
        });
      },
    })
  );

  const onSubmit = (data: CreateOrganizationFormValues) => {
    createOrganizationMutation.mutate(data);
  };

  const isLoading = createOrganizationMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>新しい組織を作成</DialogTitle>
          <DialogDescription>
            新しい組織を作成します。あなたは自動的に管理者として設定されます。
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="organizationName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>組織名 *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="例: 山田農園"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    組織の名前を入力してください（1-100文字）
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
                  <FormLabel>説明（任意）</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="組織の説明や目的などを入力してください"
                      className="resize-none"
                      rows={3}
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>組織の説明（最大500文字）</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "作成中..." : "組織を作成"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
