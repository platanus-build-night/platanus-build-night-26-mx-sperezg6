"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { createClientAction, type ActionState } from "@/lib/actions";

const initial: ActionState = { ok: false };

export function CreateClientDialog() {
  const router = useRouter();
  return (
    <Dialog
      title="Nuevo cliente"
      description="Registra una empresa cliente para gestionar sus apps y agentes."
      trigger={
        <Button>
          <Plus className="size-4" strokeWidth={2} /> Nuevo cliente
        </Button>
      }
    >
      {(close) => (
        <ClientForm onCancel={close} onDone={() => { close(); router.refresh(); }} />
      )}
    </Dialog>
  );
}

function ClientForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [state, action, pending] = useActionState(createClientAction, initial);
  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="space-y-4">
      <Field label="Nombre">
        <Input name="name" placeholder="Acme Inc." autoFocus required />
      </Field>
      <Field label="Sitio web" hint="Opcional">
        <Input name="website" type="url" placeholder="https://acme.com" />
      </Field>
      <Field label="Contacto" hint="Opcional">
        <Input name="contact" placeholder="ana@acme.com" />
      </Field>
      <Field label="Imagen" hint="Opcional — URL para la portada de la tarjeta">
        <Input name="logo_url" type="url" placeholder="https://…/imagen.jpg" />
      </Field>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Crear cliente"}
        </Button>
      </div>
    </form>
  );
}
