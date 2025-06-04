"use client";

import React from "react";
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
import { useAuthActions } from "@/lib/auth-context";

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
      },
      {
        id: "realtime",
        label: "リアルタイムデータ",
        icon: ChartIcon,
        disabled: true,
        badge: "準備中",
      },
      {
        id: "history",
        label: "履歴データ",
        icon: HistoryIcon,
        disabled: true,
        badge: "準備中",
      },
    ],
  },
  {
    id: "settings",
    title: "設定",
    items: [
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
      },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { signOut } = useAuthActions();

  const handleLogout = () => {
    signOut();
  };

  // アクティブ状態の判定
  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/organization/settings">
                <BuildingIcon className="h-4 w-4" />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate">組織名</span>
                </div>
              </Link>
            </SidebarMenuButton>
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
            <SidebarMenuButton asChild>
              <div className="flex items-center gap-3 px-2 py-2">
                <UserIcon className="h-4 w-4" />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate">
                    ユーザー名
                  </span>
                  <span className="text-xs text-sidebar-foreground/70 truncate">
                    user@example.com
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
