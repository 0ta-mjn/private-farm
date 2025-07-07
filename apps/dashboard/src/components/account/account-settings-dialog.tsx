"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
  DialogTitle,
} from "@/shadcn/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shadcn/tabs";
import { SettingsIcon, UserRoundPenIcon } from "lucide-react";
import { EmailSettingRow } from "@/components/account/email-setting-row";
import { PasswordSettingRow } from "@/components/account/password-setting-row";
import { DiscordSettingRow } from "@/components/account/discord-setting-row";
import { AccountDeleteRow } from "@/components/account/account-delete-row";
import { ProfileSettingRow } from "@/components/account/profile-setting-row";
import { useQuery } from "@tanstack/react-query";
import { auth } from "@/lib/auth-provider";

interface AccountSettingsDialogProps {
  children: React.ReactNode;
}

const TABS = {
  PROFILE: "profile",
  LOGIN: "login",
};
const validTabs = Object.values(TABS);

// URLハッシュの解析とタブ名の検証
function parseHashParams() {
  if (typeof window === "undefined") return null;

  const hash = window.location.hash.slice(1); // #を除去
  const params = new URLSearchParams(hash);

  const tab = params.get("settings");
  return tab && validTabs.includes(tab) ? tab : null;
}

// URLハッシュを更新
function updateHashParams(tab: string | null) {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams();

  if (tab) {
    params.set("settings", tab);
  }

  const newHash = params.toString();
  const newUrl = newHash
    ? `#${newHash}`
    : window.location.pathname + window.location.search;

  // pushState を使って履歴に追加せずにURLを更新
  window.history.replaceState(null, "", newUrl);
}

export function AccountSettingsDialog({
  children,
}: AccountSettingsDialogProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const open = activeTab !== null;

  // マウント時にURLハッシュから初期状態を取得
  useEffect(() => {
    setMounted(true);
    const tab = parseHashParams();
    setActiveTab(tab);
  }, []);

  // URLハッシュの変更を監視
  useEffect(() => {
    if (!mounted) return;

    const handleHashChange = () => {
      const tab = parseHashParams();
      setActiveTab(tab);
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [mounted]);

  // タブ変更時にURLハッシュを更新
  const handleTabChange = (newTab: string | null) => {
    setActiveTab(newTab);
    updateHashParams(newTab);
  };

  const { data, refetch } = useQuery({
    queryKey: ["supabaseUserIdentities"],
    queryFn: () => auth.getIdentities(),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          handleTabChange(null);
        }
      }}
    >
      <DialogTrigger
        asChild
        onClick={() => {
          handleTabChange(TABS.PROFILE);
        }}
      >
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>アカウント設定</DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab || undefined}
          onValueChange={handleTabChange}
          className="flex w-full gap-6 sm:flex-row"
        >
          <TabsList className="flex h-fit sm:flex-col">
            <TabsTrigger value={TABS.PROFILE} className="w-full justify-start">
              <UserRoundPenIcon className="h-4 w-4" />
              プロフィール
            </TabsTrigger>
            <TabsTrigger value={TABS.LOGIN} className="w-full justify-start">
              <SettingsIcon className="h-4 w-4" />
              ログイン設定
            </TabsTrigger>
          </TabsList>

          {/* 右側のコンテンツ */}
          <div className="flex-1">
            <TabsContent value={TABS.PROFILE} className="space-y-4 mt-0">
              <h3 className="font-bold">プロフィール</h3>

              <ProfileSettingRow />
            </TabsContent>

            <TabsContent value={TABS.LOGIN} className="space-y-4 mt-0">
              <h3 className="font-bold">ログイン設定</h3>

              <div className="rounded-lg border p-4 space-y-4">
                {data?.some(
                  (identity) => identity.provider === "email"
                ) && (
                  <>
                    <EmailSettingRow />
                    <PasswordSettingRow onSuccess={refetch} />
                  </>
                )}

                <DiscordSettingRow
                  identity={data?.find(
                    (identity) => identity.provider === "discord"
                  )}
                  onSuccess={refetch}
                  disabled={data?.length === 1}
                />
              </div>

              <div className="rounded-lg border border-red-200 bg-red-50 space-y-3 p-4">
                <AccountDeleteRow />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
