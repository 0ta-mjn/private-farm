"use client";

import { AppSidebar } from "@/app/(dashboard)/sidebar";
import { Header } from "@/app/(dashboard)/header";
import { SidebarProvider, SidebarInset } from "@/shadcn/sidebar";
import { useRequireAuthAndSetup } from "@/lib/auth-hooks";
import { TRPCProvider } from "@/trpc/trpc-provider";
import { OrganizationProvider } from "@/contexts/organization-context";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardMain({ children }: DashboardLayoutProps) {
  const { loading: isLoading } = useRequireAuthAndSetup();

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"></div>;
  }

  return (
    <TRPCProvider>
      <OrganizationProvider>
        <SidebarProvider className="h-full">
          <AppSidebar />
          <SidebarInset className="min-h-0">
            <Header />
            <main className="flex flex-col min-h-0 px-4 py-6 lg:px-8">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </OrganizationProvider>
    </TRPCProvider>
  );
}
