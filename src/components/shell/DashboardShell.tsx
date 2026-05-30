import { Sidebar } from "./Sidebar";
import { ShellProvider } from "./ShellContext";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <ShellProvider>
      <div className="flex h-svh overflow-hidden bg-cream">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </ShellProvider>
  );
}
