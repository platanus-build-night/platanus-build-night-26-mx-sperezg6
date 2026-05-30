"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { rerunRunAction } from "@/lib/run-actions";

/** Re-run a past run → creates a new run (immutable history) and navigates to it. */
export function RerunButton({ runId }: { runId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-danger">{error}</span>}
      <Button
        variant="secondary"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = await rerunRunAction(runId);
            if (res.ok && res.runId) router.push(`/runs/${res.runId}`);
            else setError(res.error ?? "No se pudo re-ejecutar");
          })
        }
      >
        <RotateCw className="size-4" strokeWidth={1.75} />
        {pending ? "Re-ejecutando…" : "Re-ejecutar"}
      </Button>
    </div>
  );
}
