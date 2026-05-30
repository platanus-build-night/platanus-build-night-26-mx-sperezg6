"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { deleteAgentAction } from "@/lib/actions";

/** Deletes an agent (and tears down its AgentCore Runtime) after confirmation. */
export function DeleteAgentButton({ agentId, agentName }: { agentId: string; agentName: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog
      title="Eliminar agente"
      description="Esta acción no se puede deshacer."
      trigger={
        <Button variant="danger" size="sm" aria-label="Eliminar agente">
          <Trash2 className="size-4" strokeWidth={1.75} /> Eliminar
        </Button>
      }
    >
      {(close) => (
        <div className="space-y-4">
          <p className="text-sm text-mute">
            Se eliminará <span className="font-medium text-ink">{agentName}</span> y su runtime
            dedicado de AgentCore. Las ejecuciones pasadas se conservan.
          </p>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={close} disabled={pending}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  try {
                    await deleteAgentAction(agentId);
                    router.push("/agents");
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "No se pudo eliminar");
                  }
                })
              }
            >
              <Trash2 className="size-4" strokeWidth={1.75} />
              {pending ? "Eliminando…" : "Eliminar definitivamente"}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
