"use client";

import {
  ArrowDown,
  ArrowUp,
  Bell,
  MoreHorizontal,
  Pin,
  Settings,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { DropdownMenu, type DropdownItem } from "@/components/ui/DropdownMenu";
import { cn } from "@/lib/utils";

const cardMenuItems: DropdownItem[] = [
  { label: "Configurar", icon: Settings },
  { label: "Crear alerta", icon: Bell },
  { label: "Fijar al panel", icon: Pin },
  "separator",
  { label: "Quitar", icon: Trash2, destructive: true },
];

/**
 * KPI statistics card: icon box + title, a "more" menu, the big value with a
 * tinted delta badge, and a "Vs. mes pasado" footer line.
 */
export function StatCard({
  label,
  value,
  delta,
  positive,
  vsLast,
  icon: Icon,
}: {
  label: string;
  value: string;
  delta?: string;
  positive: boolean;
  vsLast: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-[var(--radius)] border border-line bg-surface p-5 transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_8px_24px_-12px_rgba(10,10,10,0.18)]">
      {/* Top row: icon + title / more menu */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-sm)] border border-line text-ink">
            <Icon className="size-5" strokeWidth={1.5} />
          </span>
          <p className="text-overline truncate">{label}</p>
        </div>
        <DropdownMenu
          align="end"
          items={cardMenuItems}
          trigger={
            <button
              type="button"
              aria-label="Más opciones"
              className="grid size-7 shrink-0 place-items-center rounded-md text-faint transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <MoreHorizontal className="size-4" strokeWidth={1.75} />
            </button>
          }
        />
      </div>

      {/* Value + optional tinted delta badge */}
      <div className="mt-4 flex items-end gap-2">
        <span className="text-display text-[2rem] leading-none">{value}</span>
        {delta && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium",
              positive ? "bg-ok-bg text-ok" : "bg-danger-bg text-danger",
            )}
          >
            {positive ? (
              <ArrowUp className="size-3" strokeWidth={2} />
            ) : (
              <ArrowDown className="size-3" strokeWidth={2} />
            )}
            {delta}
          </span>
        )}
      </div>

      {/* Footer caption */}
      <div className="mt-1 border-t border-line pt-2.5">
        <p className="text-xs text-mute">{vsLast}</p>
      </div>
    </div>
  );
}
