"use client";

import React, { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/shadcn/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shadcn/dropdown-menu";
import { Skeleton } from "@/shadcn/skeleton";
import {
  HomeIcon,
  BookIcon,
  LogOutIcon,
  UserIcon,
  BuildingIcon,
  PlusIcon,
  BarChart3 as ChartIcon,
  History as HistoryIcon,
  BellIcon,
  SettingsIcon,
  Map as MapIcon,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuthActions } from "@/lib/auth-context";
import { useOrganization } from "@/contexts/organization-context";
import { useDiaryDrawerActions } from "@/contexts/diary-drawer-context";
import { CreateOrganizationDialog } from "@/components/organization/create-organization-dialog";
import { AccountSettingsDialog } from "@/components/account/account-settings-dialog";
import { Button } from "@/shadcn/button";
import { SidebarMenuItemButton } from "./sidebar-menu-item-button";
import { cn } from "@/lib/utils";
import { users } from "@/rpc/factory";

// サイドバーアイテムの型定義
interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  badge?: string;
  children?: SidebarItem[];
}

interface SidebarSection {
  id: string;
  title?: string;
  items: SidebarItem[];
}

export function AppSidebar() {
  const pathname = usePathname();
  const { signOut } = useAuthActions();
  const { currentOrganizationId, setCurrentOrganization } = useOrganization();
  const diaryDrawerActions = useDiaryDrawerActions();
  const { open: isOpenSidebar } = useSidebar();

  // サイドバーデータを取得
  const { data: sidebarData, isLoading } = useQuery(users.sidebarData());

  // デフォルト組織を設定（現在の組織が未設定の場合のみ）
  useEffect(() => {
    if (sidebarData?.defaultOrganization && !currentOrganizationId) {
      setCurrentOrganization(sidebarData.defaultOrganization.id);
    }
  }, [
    sidebarData?.defaultOrganization,
    currentOrganizationId,
    setCurrentOrganization, // useCallbackでメモ化されているため安全
  ]);

  // 現在の組織情報を取得
  const currentOrganization = currentOrganizationId
    ? sidebarData?.organizations.find(
        (org) => org.id === currentOrganizationId
      ) || sidebarData?.defaultOrganization
    : sidebarData?.defaultOrganization;

  const handleLogout = () => {
    signOut();
  };

  const handleComingSoon = () => {
    alert("この機能は準備中です");
  };

  // サイドバーの構成データ
  const sidebarSections: SidebarSection[] = [
    {
      id: "main",
      items: [
        {
          id: "home",
          label: "ホーム",
          icon: HomeIcon,
          href: "/dashboard",
        },
        {
          id: "diary",
          label: "農業日誌",
          icon: BookIcon,
          href: "/diary",
          children: [
            {
              id: "new-diary",
              label: "新しい日誌を作成",
              icon: PlusIcon,
              onClick: diaryDrawerActions.openCreate,
            },
          ],
        },
      ],
    },
    {
      id: "data",
      title: "データ管理",
      items: [
        {
          id: "things",
          label: "区画・センサー管理",
          icon: MapIcon,
          href: "/things",
        },
        {
          id: "realtime",
          label: "リアルタイムデータ",
          icon: ChartIcon,
          disabled: true,
          badge: "準備中",
          onClick: handleComingSoon,
        },
        {
          id: "history",
          label: "履歴データ",
          icon: HistoryIcon,
          disabled: true,
          badge: "準備中",
          onClick: handleComingSoon,
        },
      ],
    },
    {
      id: "settings",
      title: "設定",
      items: [
        {
          id: "organization-settings",
          label: "組織設定",
          icon: BuildingIcon,
          href: "/organization/settings",
          children: [
            {
              id: "notifications",
              label: "通知設定",
              icon: BellIcon,
              href: "/organization/settings?settings=notifications",
            },
          ],
        },
      ],
    },
  ];

  const handleOrganizationChange = (organizationId: string) => {
    setCurrentOrganization(organizationId);
  };

  // アクティブ状態の判定
  const searchParams = useSearchParams();
  const activeIds = sidebarSections.reduce<string[]>((acc, section) => {
    section.items.forEach((item) => {
      let isActive = false;
      if (item.children) {
        item.children.forEach((child) => {
          // searchParamsのクエリパラメータを考慮して、hrefが一致するか確認
          const [childPathname, childSearchParams] = child.href?.includes("?")
            ? child.href.split("?")
            : [child.href, ""];
          if (childPathname && pathname.startsWith(childPathname)) {
            const isMatch =
              childSearchParams === "" ||
              childSearchParams === searchParams.toString();
            if (isMatch) {
              acc.push(child.id);
              isActive = true;
            }
          }
        });
      }
      if (!isActive && item.href && pathname.startsWith(item.href)) {
        acc.push(item.id);
      }
    });
    return acc;
  }, []);

  // ローディング状態の表示
  if (isLoading) {
    return (
      <Sidebar collapsible="icon" data-testid="sidebar-skeleton">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuSkeleton showIcon />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          {/* メインセクション */}
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {Array.from({ length: 2 }).map((_, i) => (
                  <SidebarMenuItem key={i}>
                    <SidebarMenuSkeleton showIcon />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* データ管理セクション */}
          <SidebarGroup>
            <SidebarGroupLabel>
              <Skeleton className="h-4 w-20 bg-sidebar-foreground/40" />
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {Array.from({ length: 3 }).map((_, i) => (
                  <SidebarMenuItem key={i}>
                    <SidebarMenuSkeleton showIcon />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* 設定セクション */}
          <SidebarGroup>
            <SidebarGroupLabel>
              <Skeleton className="h-4 w-12 bg-sidebar-foreground/40" />
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {Array.from({ length: 2 }).map((_, i) => (
                  <SidebarMenuItem key={i}>
                    <SidebarMenuSkeleton showIcon />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            {/* ユーザー情報スケルトン */}
            <SidebarMenuItem>
              <SidebarMenuSkeleton showIcon />
            </SidebarMenuItem>

            {/* ログアウトスケルトン */}
            <SidebarMenuItem>
              <SidebarMenuSkeleton showIcon />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>
    );
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 py-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    className="w-full"
                    tooltip={currentOrganization?.name || "組織を選択"}
                  >
                    <div
                      className={cn(
                        "flex w-full items-center justify-center min-w-0 flex-1 gap-2 text-sidebar-accent-foreground"
                      )}
                    >
                      <BuildingIcon className="h-4 w-4 shrink-0 text-current" />
                      {isOpenSidebar && (
                        <span className="text-sm flex-1 min-w-0 font-medium truncate inline-block">
                          {currentOrganization?.name || "組織を選択"}
                        </span>
                      )}
                    </div>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>

                <DropdownMenuContent className="w-56">
                  {sidebarData?.organizations?.map((org) => (
                    <DropdownMenuItem
                      key={org.id}
                      onClick={() => handleOrganizationChange(org.id)}
                      className="group"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{org.name}</span>
                        <span className="text-xs text-muted-foreground group-focus:text-muted">
                          {org.role === "admin" ? "管理者" : "メンバー"}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  ))}

                  <DropdownMenuSeparator />

                  <DropdownMenuItem asChild>
                    <CreateOrganizationDialog>
                      <Button variant="ghost" className="w-full">
                        <div className="flex items-center gap-2 w-full cursor-pointer text-sm">
                          <PlusIcon className="h-4 w-4" />
                          <span>新しい組織を作成</span>
                        </div>
                      </Button>
                    </CreateOrganizationDialog>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {sidebarSections.map((section) => (
          <SidebarGroup key={section.id}>
            {section.title && (
              <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuItemButton
                      item={item}
                      isActive={activeIds.includes(item.id)}
                    />

                    {item.children && item.children.length > 0 && (
                      <SidebarMenuSub>
                        {item.children.map((child) => (
                          <SidebarMenuSubItem key={child.id}>
                            <SidebarMenuItemButton
                              item={child}
                              isActive={activeIds.includes(child.id)}
                              isSubItem={true}
                            />
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {/* ユーザー情報 */}
          <SidebarMenuItem>
            <AccountSettingsDialog>
              <SidebarMenuButton
                asChild
                size="lg"
                data-testid="sidebar-account-settings-button"
                tooltip="アカウント設定"
              >
                <div className="flex items-center justify-center gap-3 py-2 cursor-pointer">
                  <UserIcon className="h-4 w-4" />
                  {isOpenSidebar && (
                    <>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium truncate">
                          {sidebarData?.user?.name || "ユーザー名"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          アカウント設定を編集
                        </span>
                      </div>
                      <SettingsIcon className="h-4 w-4 ml-auto text-sidebar-accent-foreground" />
                    </>
                  )}
                </div>
              </SidebarMenuButton>
            </AccountSettingsDialog>
          </SidebarMenuItem>

          {/* ログアウト */}
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} tooltip="ログアウト">
              <LogOutIcon className="h-4 w-4" />
              <span>ログアウト</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
