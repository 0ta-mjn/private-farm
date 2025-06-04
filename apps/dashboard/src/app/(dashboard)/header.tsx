"use client";

import { SidebarTrigger } from "@/shadcn/sidebar";

export function Header() {
  return (
    <header className="flex shrink-0 items-center px-3 py-2">
      <SidebarTrigger />
    </header>
  );
}
