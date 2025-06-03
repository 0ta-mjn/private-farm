"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser, useAuthLoading } from "./auth-context";

/**
 * 認証が必要なページで使用するフック
 * ユーザーが認証されていない場合は、ログインページにリダイレクトする
 */
export function useRequireAuth(redirectTo: string = "/login") {
  const user = useUser();
  const loading = useAuthLoading();
  const router = useRouter();

  useEffect(() => {
    // ローディング中は何もしない
    if (loading) return;

    // ユーザーが認証されていない場合はログインページにリダイレクト
    if (!user) {
      router.replace(redirectTo);
    }
  }, [user, loading, router, redirectTo]);

  return {
    user,
    loading,
  };
}

/**
 * 認証済みユーザーをログインページから除外するフック
 * 認証済みの場合はダッシュボードにリダイレクトする
 */
export function useRedirectIfAuthenticated(redirectTo: string = "/dashboard") {
  const user = useUser();
  const loading = useAuthLoading();
  const router = useRouter();

  useEffect(() => {
    // ローディング中は何もしない
    if (loading) return;

    // ユーザーが認証済みの場合はダッシュボードにリダイレクト
    if (user) {
      router.replace(redirectTo);
    }
  }, [user, loading, router, redirectTo]);

  return {
    user,
    loading,
  };
}
