"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { startRunForAgentAction } from "@/lib/run-actions";
import { cn } from "@/lib/utils";

type RuntimeStatus = "none" | "provisioning" | "ready" | "failed";

/**
 * Topbar control for an agent: gates "Ejecutar" on the runtime being READY.
 * While provisioning it shows "Aprovisionando…" and auto-polls; a manual
 * refresh button re-checks on demand. Legacy agents without a runtime ('none')
 * are runnable (fall back to the global runtime / mock).
 */
export function AgentRunControl({
  agentId,
  initialStatus,
}: {
  agentId: string;
  initialStatus: RuntimeStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<RuntimeStatus>(initialStatus);
  const [running, startRun] = useTransition();
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/runtime-status`, { cache: "no-store" });
      if (res.ok) setStatus(((await res.json()).status as RuntimeStatus) ?? status);
    } catch {
      /* keep last status */
    } finally {
      setChecking(false);
    }
  }, [agentId, status]);

  // Auto-poll while provisioning.
  useEffect(() => {
    if (status !== "provisioning") return;
    timer.current = setInterval(refresh, 5000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [status, refresh]);

  function run() {
    setError(null);
    startRun(async () => {
      const res = await startRunForAgentAction(agentId);
      if (res.ok && res.runId) router.push(`/runs/${res.runId}`);
      else setError(res.error ?? "No se pudo iniciar la ejecución");
    });
  }

  const canRun = status === "ready" || status === "none";

  return (
    <div className="flex items-center gap-2">
      {error && <span className="hidden text-xs text-danger sm:inline">{error}</span>}

      {status === "provisioning" && (
        <span className="text-mono inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-warn">
          <Loader2 className="size-3.5 animate-spin" strokeWidth={2} /> Aprovisionando…
        </span>
      )}
      {status === "failed" && (
        <span className="text-mono text-xs uppercase tracking-wide text-danger">
          Aprovisionamiento falló
        </span>
      )}

      {/* Refresh button — re-checks runtime status on demand */}
      {(status === "provisioning" || status === "failed") && (
        <Button variant="secondary" size="sm" onClick={refresh} disabled={checking} aria-label="Actualizar estado">
          <RefreshCw className={cn("size-4", checking && "animate-spin")} strokeWidth={1.75} />
          Actualizar
        </Button>
      )}

      <Button onClick={run} disabled={!canRun || running}>
        <Play className="size-4" strokeWidth={2} />
        {running ? "Iniciando…" : "Ejecutar"}
      </Button>
    </div>
  );
}
