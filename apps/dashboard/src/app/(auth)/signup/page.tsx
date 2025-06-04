"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/shadcn/button";
import { Input } from "@/shadcn/input";
import { Checkbox } from "@/shadcn/checkbox";
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
  EyeIcon,
  EyeOffIcon,
  AlertCircleIcon,
  CheckCircleIcon,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// フォームバリデーションスキーマ
const formSchema = z
  .object({
    email: z
      .string()
      .min(1, "メールアドレスを入力してください")
      .email("有効なメールアドレスを入力してください"),
    password: z
      .string()
      .min(8, "パスワードは8文字以上で入力してください")
      .regex(
        /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "パスワードは大文字、小文字、数字を含む必要があります"
      ),
    confirmPassword: z.string().min(1, "パスワード確認を入力してください"),
    agreeToTerms: z.boolean().refine((val) => val === true, {
      message: "利用規約に同意してください",
    }),
    agreeToPrivacy: z.boolean().refine((val) => val === true, {
      message: "プライバシーポリシーに同意してください",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "パスワードが一致しません",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof formSchema>;

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      agreeToTerms: false,
      agreeToPrivacy: false,
    },
  });

  // フォーム送信処理
  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    setGeneralError(null);

    try {
      // Supabase Auth にユーザー登録リクエスト
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      });

      if (error) {
        // エラーコードによる分岐処理
        switch (error.code) {
          case "email_exists":
          case "user_already_exists":
            setGeneralError(
              "このメールアドレスは既に登録されています。ログインしてください。"
            );
            break;
          case "validation_failed":
            setGeneralError(
              "入力内容に問題があります。もう一度確認してください。"
            );
            break;
          case "weak_password":
            setGeneralError(
              "パスワードが脆弱です。より強力なパスワードを設定してください。"
            );
            break;
          case "signup_disabled":
            setGeneralError(
              "サインアップが無効になっています。管理者にお問い合わせください。"
            );
            break;
          case "over_request_rate_limit":
            setGeneralError(
              "リクエストが多すぎます。しばらく時間をおいてから再度お試しください。"
            );
            break;
          case "over_email_send_rate_limit":
            setGeneralError(
              "メール送信の制限に達しました。しばらく時間をおいてから再度お試しください。"
            );
            break;
          case "captcha_failed":
            setGeneralError("認証に失敗しました。再度お試しください。");
            break;
          default:
            setGeneralError(
              error.message || "サインアップ中にエラーが発生しました"
            );
            break;
        }
        return;
      }

      if (data.user) {
        setUserEmail(values.email);
        setEmailSent(true);
      }
    } catch (err) {
      console.error("Signup error:", err);
      setGeneralError("サインアップ中にエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  // メール送信完了画面
  if (emailSent) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <CheckCircleIcon className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl">確認メールを送信しました</CardTitle>
          <CardDescription>
            {userEmail} に確認メールを送信しました。
            メール内のリンクをクリックして、アカウントを有効化してください。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 text-center mb-4">
            メールが届かない場合は、迷惑メールフォルダもご確認ください。
          </p>
          <Button
            onClick={() => {
              setEmailSent(false);
              setUserEmail("");
              form.reset();
            }}
            variant="outline"
            className="w-full"
          >
            別のメールアドレスで登録する
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">アカウント作成</CardTitle>
        <CardDescription>
          Private Farm へようこそ。アカウントを作成してください。
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

            {/* パスワード */}
            <div className="space-y-2">
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
                            <EyeOffIcon className="h-4 w-4 text-gray-400" />
                          ) : (
                            <EyeIcon className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormDescription>
                      8文字以上、大文字・小文字・数字を含む必要があります
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* パスワード確認 */}
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="パスワードを再入力"
                          className="pr-10"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showConfirmPassword ? (
                            <EyeOffIcon className="h-4 w-4 text-gray-400" />
                          ) : (
                            <EyeIcon className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 同意チェックボックス */}
            <FormField
              control={form.control}
              name="agreeToTerms"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm">
                      <a
                        href="/terms"
                        className="text-external hover:underline"
                      >
                        利用規約
                      </a>
                      に同意します
                    </FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="agreeToPrivacy"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm">
                      <a
                        href="/privacy"
                        className="text-external hover:underline"
                      >
                        プライバシーポリシー
                      </a>
                      に同意します
                    </FormLabel>
                    <FormMessage />
                  </div>
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
              {isLoading ? "作成中..." : "アカウントを作成"}
            </Button>
          </form>
        </Form>

        {/* ログインリンク */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            すでにアカウントをお持ちの方は{" "}
            <Link href="/login">
              <Button variant="link" className="p-0 h-auto hover:underline">
                ログイン
              </Button>
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
