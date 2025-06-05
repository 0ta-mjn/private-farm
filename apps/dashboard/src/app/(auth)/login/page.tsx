"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shadcn/form";
import { EyeIcon, EyeOffIcon, AlertCircleIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { trpcClient } from "@/trpc/client";

// フォームバリデーションスキーマ
const formSchema = z.object({
  email: z
    .string()
    .min(1, "メールアドレスを入力してください")
    .email("有効なメールアドレスを入力してください"),
  password: z.string().min(1, "パスワードを入力してください"),
});

type FormValues = z.infer<typeof formSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // フォーム送信処理
  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    setGeneralError(null);

    try {
      // Supabase Auth にログインリクエスト
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        // エラーコードによる分岐処理
        switch (error.code) {
          case "invalid_credentials":
            setGeneralError(
              "メールアドレスまたはパスワードが正しくありません。"
            );
            break;
          case "email_not_confirmed":
            setGeneralError(
              "メールアドレスが確認されていません。確認メールをご確認いただくか、再度ご登録ください。"
            );
            break;
          case "too_many_requests":
            setGeneralError(
              "ログイン試行回数が多すぎます。しばらく時間をおいてから再度お試しください。"
            );
            break;
          case "signin_disabled":
            setGeneralError(
              "サインインが無効になっています。管理者にお問い合わせください。"
            );
            break;
          case "over_request_rate_limit":
            setGeneralError(
              "リクエストが多すぎます。しばらく時間をおいてから再度お試しください。"
            );
            break;
          default:
            setGeneralError(
              error.message || "ログイン中にエラーが発生しました"
            );
            break;
        }
        return;
      }

      if (data.user) {
        try {
          // tRPCで初期設定状態を確認
          const setupStatus = await trpcClient.user.setupCheck.query();

          if (setupStatus.isCompleted) {
            // 初期設定完了済みの場合はダッシュボードへ
            router.push("/dashboard");
          } else {
            // 初期設定未完了の場合はセットアップページへ
            router.push("/setup");
          }
        } catch (setupError) {
          console.error("Setup check error:", setupError);
          // setupCheck でエラーが発生した場合は、暫定的にダッシュボードへ
          setGeneralError(
            "初期設定状態の確認に失敗しました。後ほど再度お試しください。"
          );
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      setGeneralError("ログイン中にエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">ログイン</CardTitle>
        <CardDescription>Private Farm にログインしてください。</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* メールアドレス */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>メールアドレス</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* パスワード */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>パスワード</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="パスワードを入力"
                        className="pr-10"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPassword ? (
                          <EyeOffIcon className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <EyeIcon className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  </FormControl>
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
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "ログイン中..." : "ログイン"}
            </Button>
          </form>
        </Form>

        {/* パスワードリセットリンク */}
        <div className="mt-4 text-center">
          <Link href="/reset-password">
            <Button
              variant="link"
              className="p-0 h-auto text-sm hover:underline"
            >
              パスワードをお忘れの方
            </Button>
          </Link>
        </div>

        {/* サインアップリンク */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            アカウントをお持ちでない方は{" "}
            <Link href="/signup">
              <Button variant="link" className="p-0 h-auto hover:underline">
                新規登録
              </Button>
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
