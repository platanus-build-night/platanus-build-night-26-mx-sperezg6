"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { createFeatureAction, type ActionState } from "@/lib/actions";

const initial: ActionState = { ok: false };

export function CreateFeatureDialog({ appId }: { appId: string }) {
  const router = useRouter();
  return (
    <Dialog
      title="Nueva funcionalidad"
      description="Define una funcionalidad de la app para testear (ej. Checkout, Login)."
      trigger={
        <Button size="sm" variant="secondary">
          <Plus className="size-4" strokeWidth={2} /> Funcionalidad
        </Button>
      }
    >
      {(close) => (
        <FeatureForm
          appId={appId}
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

function FeatureForm({
  appId,
  onDone,
  onCancel,
}: {
  appId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [state, action, pending] = useActionState(createFeatureAction, initial);
  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="app_id" value={appId} />
      <Field label="Nombre">
        <Input name="name" placeholder="Checkout" autoFocus required />
      </Field>
      <Field label="Descripción" hint="Opcional — qué hace y qué debe validarse">
        <Textarea name="description" placeholder="Flujo de pago con tarjeta, cupones y envío." />
      </Field>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Crear funcionalidad"}
        </Button>
      </div>
    </form>
  );
}
