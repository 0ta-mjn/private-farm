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
import { AlertCircleIcon, CheckCircleIcon, MailIcon } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// フォームバリデーションスキーマ
const formSchema = z.object({
  email: z
    .string()
    .min(1, "メールアドレスを入力してください")
    .email("有効なメールアドレスを入力してください"),
});

type FormValues = z.infer<typeof formSchema>;

export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [sentEmail, setSentEmail] = useState<string>("");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  // フォーム送信処理
  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    setGeneralError(null);

    try {
      // Supabase Auth でパスワードリセットリクエスト
      const { error } = await supabase.auth.resetPasswordForEmail(
        values.email,
        {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        }
      );

      if (error) {
        // エラーコードによる分岐処理
        switch (error.code) {
          case "over_request_rate_limit":
            setGeneralError(
              "リクエストが多すぎます。しばらく時間をおいてから再度お試しください。"
            );
            break;
          case "email_rate_limit_exceeded":
            setGeneralError(
              "メール送信の上限に達しました。しばらく時間をおいてから再度お試しください。"
            );
            break;
          default:
            setGeneralError(
              error.message || "パスワードリセット中にエラーが発生しました"
            );
            break;
        }
        return;
      }

      // 成功時の処理
      setSentEmail(values.email);
      setIsEmailSent(true);
    } catch (err) {
      console.error("Password reset error:", err);
      setGeneralError("パスワードリセット中にエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  // メール送信完了画面
  if (isEmailSent) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircleIcon className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl">メールを送信しました</CardTitle>
          <CardDescription>
            パスワードリセットの手順をメールでお送りしました。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <MailIcon className="h-4 w-4" />
            <AlertDescription>
              <strong>{sentEmail}</strong>{" "}
              にパスワードリセットリンクを送信しました。
              メールを確認してリンクをクリックしてください。
            </AlertDescription>
          </Alert>

          <div className="text-sm text-gray-600 space-y-2">
            <p>• メールが届かない場合は、迷惑メールフォルダをご確認ください</p>
            <p>• リンクは24時間有効です</p>
            <p>
              •
              メールアドレスが間違っている場合は、下記ボタンから再度お試しください
            </p>
          </div>

          <div className="space-y-2">
            <Button
              onClick={() => {
                setIsEmailSent(false);
                setGeneralError(null);
                form.reset();
              }}
              variant="outline"
              className="w-full"
            >
              別のメールアドレスで再送信
            </Button>

            <Link href="/login">
              <Button variant="link" className="w-full">
                ログイン画面に戻る
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  // メールアドレス入力画面
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">パスワードリセット</CardTitle>
        <CardDescription>
          登録済みのメールアドレスを入力してください。
          パスワードリセット用のリンクをお送りします。
        </CardDescription>
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

            {/* エラーメッセージ */}
            {generalError && (
              <Alert variant="destructive">
                <AlertCircleIcon className="h-4 w-4" />
                <AlertDescription>{generalError}</AlertDescription>
              </Alert>
            )}

            {/* 送信ボタン */}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "送信中..." : "リセットリンクを送信"}
            </Button>
          </form>
        </Form>

        {/* ログインに戻るリンク */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            パスワードを思い出しましたか？{" "}
            <Link href="/login">
              <Button variant="link" className="p-0 h-auto hover:underline">
                ログイン画面に戻る
              </Button>
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
