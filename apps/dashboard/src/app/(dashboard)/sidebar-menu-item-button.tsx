"use client";

import Link from "next/link";
import {
  SidebarMenuButton,
  SidebarMenuSubButton,
  useSidebar,
} from "@/shadcn/sidebar";

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  badge?: string;
}

interface SidebarMenuItemButtonProps {
  item: SidebarItem;
  isActive?: boolean;
  isSubItem?: boolean;
}

export function SidebarMenuItemButton({
  item,
  isActive = false,
  isSubItem = false,
}: SidebarMenuItemButtonProps) {
  const ButtonComponent = isSubItem ? SidebarMenuSubButton : SidebarMenuButton;
  const { setOpenMobile } = useSidebar();

  const content = (
    <>
      <item.icon className="h-4 w-4" />
      <span>{item.label}</span>
      {item.badge && (
        <span className="ml-auto rounded-full bg-sidebar-accent px-2 py-0.5 text-xs font-medium text-sidebar-accent-foreground">
          {item.badge}
        </span>
      )}
    </>
  );

  // hrefがある場合はLinkでラップ
  if (item.href) {
    return (
      <ButtonComponent
        asChild
        isActive={isActive}
        disabled={item.disabled}
        tooltip={item.label}
        onClick={() => {
          setOpenMobile(false);
        }}
      >
        <Link href={item.href}>{content}</Link>
      </ButtonComponent>
    );
  }

  // onClickがある場合はボタンとして表示
  return (
    <ButtonComponent
      onClick={() => {
        if (item.onClick) {
          item.onClick();
        }
        setOpenMobile(false);
      }}
      disabled={item.disabled}
      tooltip={item.label}
      isActive={isActive}
    >
      {content}
    </ButtonComponent>
  );
}
