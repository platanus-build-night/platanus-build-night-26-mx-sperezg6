"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { createTestSpecAction, type ActionState } from "@/lib/actions";

const initial: ActionState = { ok: false };

export function CreateTestSpecDialog({ featureId }: { featureId: string }) {
  const router = useRouter();
  return (
    <Dialog
      title="Nuevo caso de prueba"
      description="Escribe los pasos en lenguaje natural — un paso por línea."
      trigger={
        <Button size="sm" variant="ghost">
          <Plus className="size-3.5" strokeWidth={2} /> Caso de prueba
        </Button>
      }
    >
      {(close) => (
        <SpecForm
          featureId={featureId}
          onCancel={close}
          onDone={() => {
            close();
            router.refresh();
          }}
        />
      )}
    </Dialog>
  );
}

function SpecForm({
  featureId,
  onDone,
  onCancel,
}: {
  featureId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [state, action, pending] = useActionState(createTestSpecAction, initial);
  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="feature_id" value={featureId} />
      <Field label="Título">
        <Input name="title" placeholder="Pago con tarjeta inválida es rechazado" autoFocus required />
      </Field>
      <Field label="Pasos" hint="Un paso por línea, en lenguaje natural">
        <Textarea
          name="steps"
          className="min-h-32 font-mono text-[13px]"
          placeholder={"Ir a la página de checkout\nIngresar una tarjeta 4000 0000 0000 0002\nHacer clic en Pagar\nVerificar que aparece un mensaje de error"}
          required
        />
      </Field>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Crear caso"}
        </Button>
      </div>
    </form>
  );
}
