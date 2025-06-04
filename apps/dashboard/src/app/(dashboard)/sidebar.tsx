"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/shadcn/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shadcn/select";
import {
  HomeIcon,
  BookIcon,
  SettingsIcon,
  LogOutIcon,
  UserIcon,
  BuildingIcon,
  PlusIcon,
  Cpu as SensorIcon,
  BarChart3 as ChartIcon,
  History as HistoryIcon,
  BellIcon,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { useAuthActions } from "@/lib/auth-context";
import { useOrganization } from "@/contexts/organization-context";

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

// 組織の型定義
interface Organization {
  id: string;
  name: string;
  description: string | null;
  role: string;
  joinedAt: Date;
  updatedAt: Date;
}

export function AppSidebar() {
  const pathname = usePathname();
  const { signOut } = useAuthActions();
  const {
    currentOrganizationId,
    setCurrentOrganization,
    setDefaultOrganization,
    isInitialized,
  } = useOrganization();
  const trpc = useTRPC();

  // サイドバーデータを取得
  const { data: sidebarData, isLoading } = useQuery(
    trpc.user.sidebarData.queryOptions()
  );

  // デフォルト組織を設定
  useEffect(() => {
    if (sidebarData?.defaultOrganization && isInitialized) {
      setDefaultOrganization(sidebarData.defaultOrganization.id);
    }
  }, [sidebarData?.defaultOrganization, isInitialized, setDefaultOrganization]);

  // 現在の組織情報を取得
  const currentOrganization = currentOrganizationId
    ? sidebarData?.organizations.find(
        (org: Organization) => org.id === currentOrganizationId
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
              href: "/diary/new",
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
          id: "sensors",
          label: "センサー管理",
          icon: SensorIcon,
          disabled: true,
          badge: "準備中",
          onClick: handleComingSoon,
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
          href: "/settings/organization-settings",
        },
        {
          id: "account",
          label: "アカウント設定",
          icon: SettingsIcon,
          href: "/settings/account",
        },
        {
          id: "notifications",
          label: "通知設定",
          icon: BellIcon,
          disabled: true,
          badge: "準備中",
          onClick: handleComingSoon,
        },
      ],
    },
  ];

  const handleOrganizationChange = (organizationId: string) => {
    setCurrentOrganization(organizationId);
  };

  // アクティブ状態の判定
  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  // ローディング状態の表示
  if (isLoading || !isInitialized) {
    return (
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </SidebarHeader>
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
              <Select
                value={currentOrganizationId || ""}
                onValueChange={handleOrganizationChange}
              >
                <SelectTrigger className="h-auto w-full p-0 border-none bg-transparent hover:bg-sidebar-accent">
                  <SelectValue>
                    <div className="flex items-center min-w-0 flex-1 gap-2 px-2 text-sidebar-accent-foreground">
                      <BuildingIcon className="h-4 w-4 shrink-0 text-current" />

                      <span className="text-sm font-medium truncate">
                        {currentOrganization?.name || "組織を選択"}
                      </span>
                    </div>
                  </SelectValue>
                </SelectTrigger>

                <SelectContent>
                  {sidebarData?.organizations?.map((org: Organization) => (
                    <SelectItem key={org.id} value={org.id}>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{org.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {org.role === "admin" ? "管理者" : "メンバー"}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                    {item.href ? (
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.href)}
                        disabled={item.disabled}
                        tooltip={item.disabled ? item.badge : undefined}
                      >
                        <Link href={item.href}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                          {item.badge && (
                            <span className="ml-auto rounded-full bg-sidebar-accent px-2 py-0.5 text-xs font-medium text-sidebar-accent-foreground">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    ) : (
                      <SidebarMenuButton
                        onClick={item.onClick}
                        disabled={item.disabled}
                        tooltip={item.disabled ? item.badge : undefined}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className="ml-auto rounded-full bg-sidebar-accent px-2 py-0.5 text-xs font-medium text-sidebar-accent-foreground">
                            {item.badge}
                          </span>
                        )}
                      </SidebarMenuButton>
                    )}

                    {item.children && item.children.length > 0 && (
                      <SidebarMenuSub>
                        {item.children.map((child) => (
                          <SidebarMenuSubItem key={child.id}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={
                                child.href ? isActive(child.href) : false
                              }
                            >
                              <Link href={child.href || "#"}>
                                <child.icon className="h-4 w-4" />
                                <span>{child.label}</span>
                              </Link>
                            </SidebarMenuSubButton>
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
            <SidebarMenuButton asChild size="lg">
              <div className="flex items-center gap-3 px-2 py-2">
                <UserIcon className="h-4 w-4" />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate">
                    {sidebarData?.user?.name || "ユーザー名"}
                  </span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* ログアウト */}
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout}>
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
