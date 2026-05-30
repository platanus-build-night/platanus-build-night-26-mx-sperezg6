"use client";

import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useShell } from "./ShellContext";

export function Topbar({
  title,
  action,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  className?: string;
}) {
  const { setNavOpen } = useShell();

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-cream/80 px-4 backdrop-blur sm:px-8",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          aria-label="Abrir menú"
          onClick={() => setNavOpen(true)}
          className="-ml-1 grid size-9 shrink-0 place-items-center rounded-md text-mute transition-colors hover:bg-surface-2 hover:text-ink active:scale-90 lg:hidden"
        >
          <Menu className="size-5" strokeWidth={1.75} />
        </button>
        <h1 className="truncate text-sm font-medium text-ink">{title}</h1>
      </div>
      {action}
    </header>
  );
}
