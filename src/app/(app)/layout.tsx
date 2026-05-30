import { DashboardShell } from "@/components/shell/DashboardShell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
