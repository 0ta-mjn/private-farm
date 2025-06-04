"use client";

import { AppSidebar } from "@/app/(dashboard)/sidebar";
import { Header } from "@/app/(dashboard)/header";
import { SidebarProvider, SidebarInset } from "@/shadcn/sidebar";
import { useRequireAuth } from "@/lib/auth-hooks";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { loading: isLoading } = useRequireAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"></div>;
  }

  return (
    <SidebarProvider className="h-full">
      <AppSidebar />
      <SidebarInset className="min-h-0">
        <Header />
        <div className="flex flex-col min-h-0 px-4 py-6 lg:px-8">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
