"use client";

import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------------------
 * EntityCard — a reusable card for the listing pages (agents, clients, apps).
 *
 * Adapted from a travel "PlaceCard" reference into this product's monochrome
 * system: the photo carousel becomes a generated ink cover (no stock imagery),
 * tags become status chips, the rating becomes a headline metric, and the
 * "Book now" CTA becomes a "Ver detalle" link. Keeps the reference's feel:
 * staggered content reveal, a spring hover-lift, and an animated CTA arrow.
 * ------------------------------------------------------------------------- */

export type EntityCardProps = {
  href: string;
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  /** Initials shown on the cover instead of the icon glyph (e.g. for clients). */
  monogram?: string;
  /** Small chips overlaid on the cover (top-left). */
  badges?: string[];
  /** Optional cover image URL. When set, replaces the generated ink cover. */
  imageUrl?: string | null;
  /** Headline metric overlaid on the cover (top-right), rating-style. */
  metric?: { value: string; label?: string };
  /** Colored status pill overlaid on the cover (top-right). */
  statusBadge?: { label: string; tone: "ok" | "warn" | "danger" | "muted" };
  /** Key/value rows rendered in the card body. */
  meta?: { label: string; value: string }[];
  /** CTA label. Defaults to "Ver detalle". */
  cta?: string;
  /** Optional overlay control (e.g. a ⋯ menu) rendered top-right, above the link. */
  action?: React.ReactNode;
  /** Stable seed used to vary the cover gradient. Defaults to `title`. */
  seed?: string;
  className?: string;
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

/** Deterministic cover style from a seed — subtle, always on-brand (ink). */
function coverStyle(seed: string): React.CSSProperties {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  const angle = 120 + (Math.abs(hash) % 100); // 120–220deg
  const x = 20 + (Math.abs(hash >> 3) % 60); // 20–80%
  return {
    backgroundImage: `radial-gradient(120% 120% at ${x}% -20%, rgba(255,255,255,0.16), transparent 55%), linear-gradient(${angle}deg, #161616, #0a0a0a)`,
  };
}

export function EntityCard({
  href,
  icon: Icon,
  title,
  subtitle,
  monogram,
  imageUrl,
  badges,
  metric,
  statusBadge,
  meta,
  cta = "Ver detalle",
  action,
  seed,
  className,
}: EntityCardProps) {
  const reduceMotion = useReducedMotion();
  const hasImage = Boolean(imageUrl);
  const statusTone: Record<NonNullable<EntityCardProps["statusBadge"]>["tone"], string> = {
    ok: "bg-ok text-cream",
    warn: "bg-warn text-cream",
    danger: "bg-danger text-cream",
    muted: "bg-cream/15 text-cream",
  };

  return (
    <motion.div
      variants={itemVariants}
      whileHover={
        reduceMotion
          ? undefined
          : {
              y: -5,
              boxShadow: "0 18px 40px -18px rgba(10,10,10,0.32)",
              transition: { type: "spring", stiffness: 320, damping: 22 },
            }
      }
      className={cn("relative h-full", className)}
    >
      {action && (
        <div
          className="absolute right-3 top-3 z-20"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {action}
        </div>
      )}
      <Link
        href={href}
        className="group flex h-full flex-col overflow-hidden rounded-[var(--radius)] border border-line bg-surface transition-colors hover:border-line-strong"
      >
        {/* Cover */}
        <div
          className="relative flex h-28 items-end overflow-hidden p-4 text-cream"
          style={hasImage ? undefined : coverStyle(seed ?? title)}
        >
          {/* Image cover (when provided) + legibility overlay */}
          {hasImage && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl as string}
                alt=""
                className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/30 to-ink/10" />
            </>
          )}

          {/* Centered glyph / monogram watermark (only on the generated cover) */}
          {!hasImage && (
            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
              {monogram ? (
                <span className="text-display text-[2.75rem] leading-none text-cream/15">
                  {monogram}
                </span>
              ) : (
                <Icon
                  className="size-16 text-cream/15 transition-transform duration-500 group-hover:scale-110"
                  strokeWidth={1}
                />
              )}
            </div>
          )}

          {/* Badges (top-left) */}
          {badges && badges.length > 0 && (
            <div className="absolute left-4 top-4 flex flex-wrap gap-1.5">
              {badges.map((b) => (
                <span
                  key={b}
                  className="text-mono rounded-full bg-cream/15 px-2 py-0.5 text-[10px] uppercase tracking-wide text-cream backdrop-blur-sm"
                >
                  {b}
                </span>
              ))}
            </div>
          )}

          {/* Metric (top-right) */}
          {metric && (
            <div className="absolute right-4 top-4 flex items-baseline gap-1 rounded-full bg-cream/15 px-2 py-0.5 backdrop-blur-sm">
              <span className="text-mono text-xs font-medium text-cream">{metric.value}</span>
              {metric.label && (
                <span className="text-mono text-[10px] uppercase tracking-wide text-cream/70">
                  {metric.label}
                </span>
              )}
            </div>
          )}

          {/* Status pill (bottom-right of cover) — colored: green when ready */}
          {statusBadge && (
            <div
              className={cn(
                "text-mono absolute bottom-3 right-4 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide backdrop-blur-sm",
                statusTone[statusBadge.tone],
              )}
            >
              {statusBadge.tone === "warn" && (
                <span className="size-1.5 animate-pulse rounded-full bg-cream" />
              )}
              {statusBadge.label}
            </div>
          )}

          {/* Avatar tile, sitting on the cover's bottom edge */}
          <span className="relative grid size-10 shrink-0 place-items-center rounded-[var(--radius-sm)] border border-cream/20 bg-ink/40 text-cream backdrop-blur-sm">
            {monogram ? (
              <span className="text-xs font-semibold">{monogram}</span>
            ) : (
              <Icon className="size-5" strokeWidth={1.5} />
            )}
          </span>
        </div>

        {/* Body */}
        <motion.div
          className="flex flex-1 flex-col p-5"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
        >
          <motion.div variants={itemVariants}>
            <p className="truncate font-medium text-ink">{title}</p>
            {subtitle && <p className="mt-0.5 truncate text-xs text-mute">{subtitle}</p>}
          </motion.div>

          {meta && meta.length > 0 && (
            <motion.dl
              variants={itemVariants}
              className="text-mono mt-4 space-y-1 text-[11px] uppercase tracking-wide text-mute"
            >
              {meta.map((m) => (
                <div key={m.label} className="flex justify-between gap-2">
                  <dt>{m.label}</dt>
                  <dd className="truncate text-ink">{m.value}</dd>
                </div>
              ))}
            </motion.dl>
          )}

          <motion.div
            variants={itemVariants}
            className="mt-auto flex items-center gap-1.5 pt-4 text-sm font-medium text-mute transition-colors group-hover:text-ink"
          >
            {cta}
            <ArrowRight
              className="size-3.5 transition-transform duration-200 group-hover:translate-x-1"
              strokeWidth={1.75}
            />
          </motion.div>
        </motion.div>
      </Link>
    </motion.div>
  );
}

/** Grid wrapper that staggers the entrance of its `EntityCard` children. */
export function EntityCardGrid({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } } }}
    >
      {children}
    </motion.div>
  );
}
