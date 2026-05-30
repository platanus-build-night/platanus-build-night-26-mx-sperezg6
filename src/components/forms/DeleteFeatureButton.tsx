"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { deleteFeatureAction } from "@/lib/actions";

/** Deletes a feature and all its test specs after confirmation. */
export function DeleteFeatureButton({
  featureId,
  featureName,
  appId,
}: {
  featureId: string;
  featureName: string;
  appId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog
      title="Eliminar funcionalidad"
      description="Esta acción no se puede deshacer."
      trigger={
        <Button variant="ghost" size="sm" aria-label="Eliminar funcionalidad">
          <Trash2 className="size-4" strokeWidth={1.75} />
        </Button>
      }
    >
      {(close) => (
        <div className="space-y-4">
          <p className="text-sm text-mute">
            Se eliminará <span className="font-medium text-ink">{featureName}</span> y todos sus
            casos de prueba. Los agentes que la tenían como objetivo la perderán.
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
                    await deleteFeatureAction(featureId, appId);
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
