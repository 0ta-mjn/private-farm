"use client";

import { AppSidebar } from "@/app/(dashboard)/sidebar";
import { Header } from "@/app/(dashboard)/header";
import { SidebarProvider, SidebarInset } from "@/shadcn/sidebar";
import { useRequireAuthAndSetup } from "@/lib/auth-hooks";
import { OrganizationProvider } from "@/contexts/organization-context";
import { DiaryDrawerProvider } from "@/contexts/diary-drawer-context";
import { ThingDrawerProvider } from "@/contexts/thing-drawer-context";
import { DiaryDrawerContainer } from "@/components/diary/diary-drawer-container";
import { ThingDrawerContainer } from "@/components/thing/thing-drawer-container";
import { useOrganization } from "@/contexts/organization-context";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardMain({ children }: DashboardLayoutProps) {
  const { loading: isLoading } = useRequireAuthAndSetup();
  const { currentOrganizationId } = useOrganization();

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"></div>;
  }

  return (
    <OrganizationProvider>
      <DiaryDrawerProvider>
        <ThingDrawerProvider>
          <SidebarProvider className="h-full">
            <AppSidebar />
            <SidebarInset className="min-h-0">
              <Header />
              <main className="flex flex-col min-h-0 px-4 py-6 lg:px-8">
                {children}
              </main>
            </SidebarInset>

            {currentOrganizationId && (
              <>
                <DiaryDrawerContainer organizationId={currentOrganizationId} />
                <ThingDrawerContainer organizationId={currentOrganizationId} />
              </>
            )}
          </SidebarProvider>
        </ThingDrawerProvider>
      </DiaryDrawerProvider>
    </OrganizationProvider>
  );
}
