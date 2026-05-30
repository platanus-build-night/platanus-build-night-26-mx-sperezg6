"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { deleteTestSpecAction } from "@/lib/actions";

/** Deletes a single test spec after confirmation. */
export function DeleteTestSpecButton({
  specId,
  specTitle,
  appId,
}: {
  specId: string;
  specTitle: string;
  appId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog
      title="Eliminar caso de prueba"
      description="Esta acción no se puede deshacer."
      trigger={
        <Button variant="ghost" size="sm" aria-label="Eliminar caso de prueba">
          <Trash2 className="size-3.5" strokeWidth={1.75} />
        </Button>
      }
    >
      {(close) => (
        <div className="space-y-4">
          <p className="text-sm text-mute">
            Se eliminará el caso <span className="font-medium text-ink">{specTitle}</span>.
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
                    await deleteTestSpecAction(specId, appId);
                    close();
                    router.refresh();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "No se pudo eliminar");
                  }
                })
              }
            >
              <Trash2 className="size-4" strokeWidth={1.75} />
              {pending ? "Eliminando…" : "Eliminar"}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
