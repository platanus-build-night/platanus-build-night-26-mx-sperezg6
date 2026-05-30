"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { startRunForAgentAction } from "@/lib/run-actions";

/** "Ejecutar" — starts a run for an agent and navigates to the live run view. */
export function RunAgentButton({
  agentId,
  size = "md",
}: {
  agentId: string;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run() {
    setError(null);
    startTransition(async () => {
      const res = await startRunForAgentAction(agentId);
      if (res.ok && res.runId) {
        router.push(`/runs/${res.runId}`);
      } else {
        setError(res.error ?? "No se pudo iniciar la ejecución");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-danger">{error}</span>}
      <Button size={size} onClick={run} disabled={pending}>
        <Play className="size-4" strokeWidth={2} />
        {pending ? "Iniciando…" : "Ejecutar"}
      </Button>
    </div>
  );
}
