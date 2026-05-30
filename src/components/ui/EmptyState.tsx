import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius)] border border-dashed border-line bg-surface px-6 py-20 text-center">
      <span className="grid size-12 place-items-center rounded-full border border-line text-faint">
        <Icon className="size-5" strokeWidth={1.5} />
      </span>
      <p className="mt-4 text-base font-medium">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-mute">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
