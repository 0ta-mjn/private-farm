"use client";

import { Button } from "@/shadcn/button";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { users } from "@/rpc/factory";
import { ClientError } from "@/rpc/client";
import { Card, CardContent } from "@/shadcn/card";
import { CheckCircleIcon } from "lucide-react";

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();

  // セットアップ状態をチェック（ログイン済みの場合のみ）
  const { data: setupStatus, isLoading: isCheckingSetup } = useQuery({
    ...users.setupCheck(),
    enabled: !!user, // ログイン済みの場合のみクエリを実行
    retry: (_, e: ClientError) => {
      switch (e.status) {
        case 401:
          // 認証エラーの場合はリトライしない
          return false;
        default:
          // その他のエラーはリトライする
          return true;
      }
    },
  });

  const isLoading = authLoading || isCheckingSetup;
  const isAuthenticated = !!user;
  const isSetupCompleted = setupStatus?.isCompleted ?? false;

  // ボタンのレンダリング
  const renderButtons = () => {
    if (isLoading) {
      return null;
    }

    if (isAuthenticated && isSetupCompleted) {
      // ログイン済み＆セットアップ完了の場合：ダッシュボードボタンを表示
      return (
        <div className="flex w-full justify-center items-center gap-3">
          <Link href="/dashboard">
            <Button className="w-full max-w-xs">ダッシュボードへ</Button>
          </Link>
        </div>
      );
    } else {
      // 未ログインまたはセットアップ未完了の場合：既存のボタンを表示
      return (
        <div className="flex w-full justify-center items-center gap-3">
          <Link href="/signup">
            <Button className="w-full max-w-xs">今すぐ始める</Button>
          </Link>
          <Link href="/login">
            <Button className="w-full max-w-xs" variant="outline">
              ログイン
            </Button>
          </Link>
        </div>
      );
    }
  };

  return (
    <div className="flex flex-col container mx-auto items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <div className="text-2xl font-bold text-center">
        プライベートファームダッシュボード
      </div>

      <Card className="bg-muted/50 w-full border-none shadow-none">
        <CardContent className="p-8 space-y-8">
          <p className="text-muted-foreground">
            このダッシュボードは、個人農家向けの農作業の管理と農場の運営を支援するために設計されています。
            <br />
            現在はプロトタイプ段階であり、日誌記入機能のみが利用可能です。
          </p>

          <div className="flex items-start gap-3">
            <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-medium text-sm">開発中機能</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• センサー・デバイス管理機能</li>
                <li>• センサーリアルタイムダッシュボード</li>
                <li>• 履歴データ表示機能</li>
                <li>• 異常データアラート機能</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {renderButtons()}
    </div>
  );
}
