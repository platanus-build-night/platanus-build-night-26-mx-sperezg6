"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

/**
 * Real session video: plays the AgentCore rrweb recording (DOM event stream)
 * with rrweb-player. Fetches events from /api/replay/[runSpecId] (S3 → gunzip
 * → NDJSON) and mounts the player. This is the true session replay, not frames.
 */
export function SessionReplayPlayer({ runSpecId }: { runSpecId: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "empty" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let player: any = null;

    (async () => {
      try {
        const res = await fetch(`/api/replay/${runSpecId}`, { cache: "no-store" });
        if (!res.ok) throw new Error("no recording");
        const { events } = (await res.json()) as { events: unknown[] };
        if (cancelled) return;
        if (!events || events.length < 2) {
          setState("empty");
          return;
        }

        const [{ default: rrwebPlayer }] = await Promise.all([
          import("rrweb-player"),
          import("rrweb-player/dist/style.css"),
        ]);
        if (cancelled || !hostRef.current) return;
        hostRef.current.innerHTML = "";

        const width = Math.min(hostRef.current.offsetWidth || 880, 1200);
        player = new rrwebPlayer({
          target: hostRef.current,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          props: { events: events as any[], width, height: Math.round(width * 0.6), autoPlay: true, showController: true },
        });
        setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    })();

    return () => {
      cancelled = true;
      try {
        player?.$destroy?.();
      } catch {
        /* noop */
      }
    };
  }, [runSpecId]);

  return (
    <div className="relative w-full">
      <div ref={hostRef} className="w-full overflow-hidden rounded-[var(--radius-sm)]" />
      {state !== "ready" && (
        <div className="grid place-items-center rounded-[var(--radius-sm)] border border-line bg-surface-2 py-16 text-center text-faint">
          {state === "loading" && <Loader2 className="size-6 animate-spin" strokeWidth={1.5} />}
          {state === "empty" && <span className="text-sm">La grabación aún se está procesando…</span>}
          {state === "error" && <span className="text-sm">No se pudo cargar la grabación.</span>}
        </div>
      )}
    </div>
  );
}
