"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, MonitorPlay } from "lucide-react";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { DcvLiveView } from "@/components/runs/DcvLiveView";
import type { LiveSpec } from "@/lib/runs-data";
import { cn } from "@/lib/utils";

/** A real DCV live-view URL (not the mock:// placeholder). */
function isLiveUrl(u: string | null): u is string {
  return !!u && u.startsWith("http");
}

/** DCV is opt-in (short-lived presigned URL); screenshots are the default view. */
const useDcv = process.env.NEXT_PUBLIC_USE_DCV === "1";

/**
 * Live multi-agent grid. Each tile = one run_spec's browser session. In mock
 * mode it renders a simulated viewport + current step; in real mode the tile
 * will embed BrowserLiveView (DCV) fed by spec.live_view_url.
 */
export function LiveGrid({ initial }: { initial: LiveSpec[] }) {
  const [specs, setSpecs] = useState<LiveSpec[]>(initial);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch("/api/live", { cache: "no-store" });
        if (res.ok && alive) setSpecs(((await res.json()).specs as LiveSpec[]) ?? []);
      } catch {
        /* keep polling */
      }
    };
    const t = setInterval(tick, 1200);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  if (specs.length === 0) {
    return (
      <EmptyState
        icon={MonitorPlay}
        title="No hay agentes ejecutando ahora"
        description="Ejecuta un agente para ver aquí, en vivo, cada navegador testeando la app en paralelo."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {specs.map((spec) => (
        <Tile key={spec.id} spec={spec} />
      ))}
    </div>
  );
}

function Tile({ spec }: { spec: LiveSpec }) {
  const pct = spec.totalSteps > 0 ? Math.round((spec.doneSteps / spec.totalSteps) * 100) : 0;

  return (
    <Link
      href={spec.run ? `/runs/${spec.run.id}` : "#"}
      className="group overflow-hidden rounded-[var(--radius)] border border-line bg-surface transition-colors hover:border-line-strong"
    >
      {/* Viewport: live screenshot stream (reliable; updates each poll). DCV is
          opt-in via NEXT_PUBLIC_USE_DCV since its presigned URL is short-lived. */}
      <div className="relative aspect-video overflow-hidden border-b border-line bg-surface-2">
        {useDcv && isLiveUrl(spec.live_view_url) ? (
          <DcvLiveView url={spec.live_view_url} className="absolute inset-0" />
        ) : spec.latestShot ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={spec.latestShot}
            alt={spec.title}
            className="absolute inset-0 size-full object-cover object-top"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <Loader2 className="size-6 animate-spin text-faint" strokeWidth={1.5} />
          </div>
        )}
        <span className="text-mono absolute left-2 top-2 z-10 rounded bg-ink/80 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-cream">
          ● live
        </span>
        {/* progress bar */}
        <div className="absolute inset-x-0 bottom-0 z-10 h-1 bg-line">
          <div
            className={cn("h-full bg-ink transition-all duration-500")}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium">{spec.run?.agent?.name ?? "Agente"}</p>
          <StatusPill status={spec.status} />
        </div>
        <p className="mt-1 truncate text-xs text-mute">{spec.title}</p>
        <p className="text-mono mt-2 truncate text-[11px] text-faint">
          {spec.currentStep ?? "Preparando…"}
          {spec.totalSteps > 0 ? `  ·  ${spec.doneSteps}/${spec.totalSteps}` : ""}
        </p>
      </div>
    </Link>
  );
}
