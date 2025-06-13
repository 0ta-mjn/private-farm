"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/shadcn/button";
import { Input } from "@/shadcn/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shadcn/card";
import { Alert, AlertDescription } from "@/shadcn/alert";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shadcn/form";
import {
  AlertCircleIcon,
  CheckCircleIcon,
  UserIcon,
  BuildingIcon,
  Loader2Icon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/auth-hooks";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

// フォームバリデーションスキーマ
const setupSchema = z.object({
  userName: z
    .string()
    .min(2, "ユーザー名は2文字以上で入力してください")
    .max(50, "ユーザー名は50文字以下で入力してください"),
  organizationName: z
    .string()
    .min(1, "組織名を入力してください")
    .max(100, "組織名は100文字以下で入力してください"),
});

type SetupFormValues = z.infer<typeof setupSchema>;

export default function SetupPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useRequireAuth();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [generalError, setGeneralError] = useState<string | null>(null);

  // 初期設定状態の確認
  const { data: setupStatus, isLoading: isCheckingSetup } = useQuery(
    trpc.user.setupCheck.queryOptions(undefined, {
      enabled: !!user && !authLoading,
    })
  );

  // 初期設定が完了している場合はダッシュボードにリダイレクト
  useEffect(() => {
    if (!authLoading && !isCheckingSetup && setupStatus?.isCompleted) {
      router.replace("/dashboard");
    }
  }, [authLoading, isCheckingSetup, setupStatus, router]);

  const form = useForm<SetupFormValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      userName: "",
      organizationName: "",
    },
  });

  // フォーム送信処理
  const setupMutation = useMutation(
    trpc.user.setup.mutationOptions({
      onSuccess: async (data) => {
        console.log("Setup successful:", data);

        // 初期設定状態のキャッシュを無効化
        await queryClient.invalidateQueries({
          queryKey: trpc.user.setupCheck.queryKey(),
        });

        // ユーザー関連のキャッシュも無効化（サイドバーデータなど）
        queryClient.invalidateQueries({
          queryKey: trpc.user.sidebarData.queryKey(),
        });

        router.push("/dashboard");
      },
      onError: (error) => {
        console.error("Setup error:", error);
        setGeneralError(
          error instanceof Error ? error.message : "初期設定に失敗しました"
        );
      },
    })
  );

  const onSubmit = async (values: SetupFormValues) => {
    if (!user) {
      setGeneralError("ユーザー情報が見つかりません");
      return;
    }

    setGeneralError(null);
    setupMutation.mutate(values);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
          <UserIcon className="h-6 w-6 text-blue-600" />
        </div>
        <CardTitle className="text-2xl">初期設定</CardTitle>
        <CardDescription>
          Private Farm を始めるために、基本情報を設定してください。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* ユーザー名 */}
            <FormField
              control={form.control}
              name="userName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>名前</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="あなたの名前"
                        className="pl-10"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 組織名 */}
            <FormField
              control={form.control}
              name="organizationName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>組織名</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <BuildingIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="あなたの農場名または組織名"
                        className="pl-10"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    農場名、会社名、グループ名などを入力してください
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* エラーメッセージ */}
            {generalError && (
              <Alert variant="destructive">
                <AlertCircleIcon className="h-4 w-4" />
                <AlertDescription>{generalError}</AlertDescription>
              </Alert>
            )}

            {/* 送信ボタン */}
            <Button
              type="submit"
              className="w-full"
              disabled={setupMutation.isPending || authLoading}
            >
              {setupMutation.isPending ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  設定中...
                </>
              ) : (
                "初期設定を完了"
              )}
            </Button>
          </form>
        </Form>

        {/* 追加情報 */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-start space-x-3">
            <CheckCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-900">
                設定完了後にできること
              </p>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• IoTデバイスの管理</li>
                <li>• 農場データの可視化</li>
                <li>• 農作業日誌の記録</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
