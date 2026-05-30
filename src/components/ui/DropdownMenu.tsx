"use client";

import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type DropdownItem =
  | "separator"
  | {
      label: string;
      icon?: LucideIcon;
      onClick?: () => void;
      destructive?: boolean;
    };

/**
 * Bespoke dropdown menu (no radix/shadcn). Click the trigger to toggle; closes
 * on outside-click and Escape. Pass `items` (with optional "separator" strings)
 * and an optional alignment.
 */
export function DropdownMenu({
  trigger,
  items,
  align = "end",
}: {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <span onClick={() => setOpen((v) => !v)}>{trigger}</span>
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute top-full z-20 mt-1 min-w-[11rem] rounded-[var(--radius-sm)] border border-line bg-surface p-1 shadow-lg",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {items.map((item, i) => {
            if (item === "separator") {
              return <div key={`sep-${i}`} className="my-1 h-px bg-line" />;
            }
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  item.onClick?.();
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                  item.destructive
                    ? "text-danger hover:bg-danger-bg"
                    : "text-ink hover:bg-surface-2",
                )}
              >
                {Icon && (
                  <Icon
                    className={cn("size-4 shrink-0", item.destructive ? "text-danger" : "text-faint")}
                    strokeWidth={1.5}
                  />
                )}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
