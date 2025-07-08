"use client";

import { useState } from "react";
import { Button } from "@/shadcn/button";
import { EditIcon } from "lucide-react";
import { useUser } from "@/lib/auth-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/shadcn/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shadcn/dialog";
import { Alert, AlertDescription } from "@/shadcn/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shadcn/form";
import { AlertCircleIcon, CheckCircleIcon } from "lucide-react";
import { auth } from "@/lib/auth-provider";
import { AuthError } from "@repo/auth-client";

interface EmailSettingRowProps {
  onSuccess?: () => void | Promise<unknown>;
}

export function EmailSettingRow({ onSuccess }: EmailSettingRowProps) {
  const user = useUser();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleEmailAction = () => {
    setDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    onSuccess?.();
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">メールアドレス</span>
          </div>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleEmailAction}>
            <EditIcon className="h-4 w-4 mr-2" />
            変更
          </Button>
        </div>
      </div>

      <EmailChangeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleDialogSuccess}
      />
    </>
  );
}

// フォームバリデーションスキーマ
const formSchema = z
  .object({
    newEmail: z
      .string()
      .min(1, "メールアドレスを入力してください")
      .email("有効なメールアドレスを入力してください"),
    confirmEmail: z
      .string()
      .min(1, "メールアドレス確認を入力してください")
      .email("有効なメールアドレスを入力してください"),
  })
  .refine((data) => data.newEmail === data.confirmEmail, {
    message: "メールアドレスが一致しません",
    path: ["confirmEmail"],
  });

type FormValues = z.infer<typeof formSchema>;

interface EmailChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EmailChangeDialog({
  open,
  onOpenChange,
  onSuccess,
}: EmailChangeDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentEmail, setSentEmail] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      newEmail: "",
      confirmEmail: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      // Supabaseでメールアドレス更新
      const data = await auth.updateEmail({
        newEmail: values.newEmail,
        redirectUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/email?email=${encodeURIComponent(
          values.newEmail
        )}`,
      });

      // 成功時の処理
      form.reset();
      onSuccess?.();
      if (data.isSentVerificationEmail) {
        setSentEmail(values.newEmail);
      } else {
        onOpenChange(false);
      }
    } catch (err) {
      console.error("Email update error:", err);
      if (err instanceof AuthError) {
        // エラーコードによる分岐処理
        switch (err.code) {
          case "invalid_request":
            setError(
              "無効なメールアドレスです。正しいメールアドレスを入力してください。"
            );
            break;
          case "user_already_exists":
            setError("このメールアドレスは既に使用されています。");
            break;
          case "rate_limit_exceeded":
            setError(
              "リクエストが多すぎます。しばらく時間をおいてから再度お試しください。"
            );
            break;
          default:
            setError(
              err.message || "メールアドレスの変更中にエラーが発生しました。"
            );
            break;
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    form.reset();
    setError(null);
    setSentEmail(null);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setSentEmail(null);
          setError(null);
          form.reset();
        }
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>メールアドレス変更</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          {sentEmail ? (
            <div className="space-y-4">
              <Alert>
                <CheckCircleIcon className="h-4 w-4" />
                <AlertDescription>
                  確認メールを{sentEmail}
                  に送信しました。メール内のリンクをクリックして変更を完了してください。
                </AlertDescription>
              </Alert>
              <DialogFooter>
                <Button type="button" onClick={handleCancel}>
                  閉じる
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* エラーメッセージ */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircleIcon className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* 新しいメールアドレス */}
              <FormField
                control={form.control}
                name="newEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>新しいメールアドレス</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="新しいメールアドレスを入力"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* メールアドレス確認 */}
              <FormField
                control={form.control}
                name="confirmEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>新しいメールアドレス（確認）</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="新しいメールアドレスを再入力"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  キャンセル
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "変更中..." : "変更"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </Form>
      </DialogContent>
    </Dialog>
  );
}
