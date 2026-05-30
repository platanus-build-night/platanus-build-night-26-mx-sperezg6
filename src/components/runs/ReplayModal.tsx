"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { SessionReplayPlayer } from "@/components/runs/SessionReplayPlayer";
import { cn } from "@/lib/utils";

export type ReplayFrame = {
  url: string;
  description: string;
  status: string;
};

const FRAME_MS = 1100;

/**
 * Session "repetición": when an AgentCore recording exists, plays the real rrweb
 * session video (SessionReplayPlayer); otherwise falls back to the per-step
 * screenshot timeline.
 */
export function ReplayModal({
  frames,
  title,
  runSpecId,
  hasRecording,
  trigger,
}: {
  frames: ReplayFrame[];
  title: string;
  runSpecId: string;
  hasRecording: boolean;
  trigger: React.ReactNode;
}) {
  return (
    <Dialog title={`Repetición — ${title}`} trigger={trigger}>
      {() =>
        hasRecording ? (
          <SessionReplayPlayer runSpecId={runSpecId} />
        ) : (
          <Player frames={frames} />
        )
      }
    </Dialog>
  );
}

function Player({ frames }: { frames: ReplayFrame[] }) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!playing || frames.length === 0) return;
    timer.current = setInterval(() => {
      setI((prev) => {
        if (prev >= frames.length - 1) {
          setPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, FRAME_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing, frames.length]);

  if (frames.length === 0) {
    return <p className="text-sm text-mute">No hay capturas para esta ejecución.</p>;
  }

  const frame = frames[Math.min(i, frames.length - 1)];
  const atEnd = i >= frames.length - 1;

  return (
    <div className="space-y-3">
      {/* Viewport */}
      <div className="relative aspect-video overflow-hidden rounded-[var(--radius-sm)] border border-line bg-surface-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={frame.url}
          alt={frame.description}
          className="absolute inset-0 size-full object-contain"
        />
      </div>

      {/* Current step caption */}
      <div className="flex items-center gap-2 text-sm">
        <span
          className={cn(
            "size-2 shrink-0 rounded-full",
            frame.status === "passed" && "bg-ok",
            frame.status === "failed" && "bg-danger",
            frame.status !== "passed" && frame.status !== "failed" && "bg-faint",
          )}
        />
        <span className="min-w-0 flex-1 truncate text-ink">{frame.description}</span>
        <span className="text-mono shrink-0 text-xs text-faint">
          {i + 1}/{frames.length}
        </span>
      </div>

      {/* Scrubber */}
      <input
        type="range"
        min={0}
        max={frames.length - 1}
        value={i}
        onChange={(e) => {
          setPlaying(false);
          setI(Number(e.target.value));
        }}
        className="w-full accent-[var(--ink)]"
      />

      {/* Controls */}
      <div className="flex items-center gap-2">
        {atEnd ? (
          <Button
            size="sm"
            onClick={() => {
              setI(0);
              setPlaying(true);
            }}
          >
            <RotateCcw className="size-4" strokeWidth={2} /> Repetir
          </Button>
        ) : (
          <Button size="sm" onClick={() => setPlaying((p) => !p)}>
            {playing ? (
              <>
                <Pause className="size-4" strokeWidth={2} /> Pausar
              </>
            ) : (
              <>
                <Play className="size-4" strokeWidth={2} /> Reproducir
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
