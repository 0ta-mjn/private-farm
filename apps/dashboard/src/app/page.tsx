"use client";

import { Button } from "@/shadcn/button";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const trpc = useTRPC();

  // セットアップ状態をチェック（ログイン済みの場合のみ）
  const { data: setupStatus, isLoading: isCheckingSetup } = useQuery(
    trpc.user.setupCheck.queryOptions(undefined, {
      enabled: !!user, // ログイン済みの場合のみクエリを実行
    })
  );

  const isLoading = authLoading || isCheckingSetup;
  const isAuthenticated = !!user;
  const isSetupCompleted = setupStatus?.isCompleted ?? false;

  // ボタンのレンダリング
  const renderButtons = () => {
    if (isLoading) {
      return (
        <div className="flex w-full justify-center items-center gap-3">
          <Button disabled className="w-full max-w-xs">
            読み込み中...
          </Button>
        </div>
      );
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
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <div className="text-2xl font-bold text-center">
        プライベートファームダッシュボード
      </div>
      <div className="text-center text-muted-foreground">
        このダッシュボードは、プライベートファームの管理と運営を支援するために設計されています。
        <br />
        詳細な機能は近日公開予定です。
      </div>

      {renderButtons()}
    </div>
  );
}
