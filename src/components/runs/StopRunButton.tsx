"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Square } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { stopRunAction } from "@/lib/run-actions";

/** Stop an in-flight run. Renders nothing once the run is no longer active. */
export function StopRunButton({
  runId,
  size = "sm",
  className,
}: {
  runId: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {error && <span className="text-xs text-danger">{error}</span>}
      <Button
        variant="danger"
        size={size}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = await stopRunAction(runId);
            if (res.ok) router.refresh();
            else setError(res.error ?? "No se pudo detener");
          })
        }
      >
        <Square className="size-3.5 fill-current" strokeWidth={1.75} />
        {pending ? "Deteniendo…" : "Detener"}
      </Button>
    </div>
  );
}
