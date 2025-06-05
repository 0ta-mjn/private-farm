import DashboardMain from "@/app/(dashboard)/main";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return <DashboardMain>{children}</DashboardMain>;
}
