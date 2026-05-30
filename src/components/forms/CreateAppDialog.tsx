"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { createAppAction, type ActionState } from "@/lib/actions";

const initial: ActionState = { ok: false };

type ClientOption = { id: string; name: string };

export function CreateAppDialog({
  clients,
  fixedClientId,
}: {
  clients: ClientOption[];
  fixedClientId?: string;
}) {
  const router = useRouter();
  return (
    <Dialog
      title="Nueva aplicación"
      description="Registra la app del cliente que los agentes van a testear."
      trigger={
        <Button>
          <Plus className="size-4" strokeWidth={2} /> Nueva app
        </Button>
      }
    >
      {(close) => (
        <AppForm
          clients={clients}
          fixedClientId={fixedClientId}
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

function AppForm({
  clients,
  fixedClientId,
  onDone,
  onCancel,
}: {
  clients: ClientOption[];
  fixedClientId?: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [state, action, pending] = useActionState(createAppAction, initial);
  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="space-y-4">
      {fixedClientId ? (
        <input type="hidden" name="client_id" value={fixedClientId} />
      ) : (
        <Field label="Cliente">
          <Select name="client_id" required defaultValue="">
            <option value="" disabled>
              Selecciona un cliente…
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label="Nombre de la app">
        <Input name="name" placeholder="Checkout web" autoFocus required />
      </Field>
      <Field label="URL base">
        <Input name="base_url" type="url" placeholder="https://app.acme.com" required />
      </Field>
      <Field label="Imagen" hint="Opcional — URL para la portada de la tarjeta">
        <Input name="image_url" type="url" placeholder="https://…/imagen.jpg" />
      </Field>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" name="login_required" className="size-4 accent-[var(--ink)]" />
        Requiere inicio de sesión
      </label>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Crear app"}
        </Button>
      </div>
    </form>
  );
}
