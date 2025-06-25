"use client";

import { useState, useEffect } from "react";
import { Button } from "@/shadcn/button";
import { Input } from "@/shadcn/input";
import { Label } from "@/shadcn/label";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client } from "@/rpc/client";
import { users } from "@/rpc/factory";

export function ProfileSettingRow() {
  const [name, setName] = useState("");
  const queryClient = useQueryClient();

  // ユーザー情報を取得
  const { data: userData, isLoading } = useQuery(users.sidebarData());

  // 名前更新の初期化
  useEffect(() => {
    if (userData?.user?.name) {
      setName(userData.user.name);
    }
  }, [userData?.user?.name]);

  // プロフィール更新のミューテーション
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name: string }) =>
      client.user.profile.$put({
        json: data,
      }),
    onSuccess: () => {
      // キャッシュを更新
      queryClient.invalidateQueries(users.sidebarData());
    },
    onError: (error) => {
      console.error("プロフィール更新エラー:", error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    updateProfileMutation.mutate({ name: name.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">ユーザー名</Label>
        <Input
          id="name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ユーザー名を入力"
          disabled={isLoading || updateProfileMutation.isPending}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setName(userData?.user?.name || "");
            updateProfileMutation.reset();
          }}
          disabled={updateProfileMutation.isPending}
        >
          キャンセル
        </Button>
        <Button
          type="submit"
          disabled={
            !name.trim() ||
            name === userData?.user?.name ||
            isLoading ||
            updateProfileMutation.isPending
          }
        >
          {updateProfileMutation.isPending ? "更新中..." : "更新"}
        </Button>
      </div>
    </form>
  );
}
