import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function SectionCard({
  title,
  count,
  footerHref,
  footerLabel,
  className,
  children,
}: {
  title?: string;
  count?: number;
  footerHref?: string;
  footerLabel?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex flex-col rounded-[var(--radius)] border border-line bg-surface",
        className,
      )}
    >
      {title && (
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-sm font-medium text-ink">{title}</h2>
          {count != null && (
            <span className="grid size-5 place-items-center rounded-full bg-surface-2 text-[11px] text-mute">
              {count}
            </span>
          )}
        </div>
      )}
      <div className="flex-1">{children}</div>
      {footerHref && footerLabel && (
        <Link
          href={footerHref}
          className="group flex items-center gap-1.5 border-t border-line px-5 py-3.5 text-sm text-mute transition-colors hover:text-ink"
        >
          {footerLabel}
          <ArrowRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
        </Link>
      )}
    </section>
  );
}
