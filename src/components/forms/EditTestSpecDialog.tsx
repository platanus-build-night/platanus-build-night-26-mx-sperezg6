"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { updateTestSpecAction, type ActionState } from "@/lib/actions";

const initial: ActionState = { ok: false };

export function EditTestSpecDialog({
  specId,
  appId,
  title,
  steps,
}: {
  specId: string;
  appId: string;
  title: string;
  /** One step per line (already joined). */
  steps: string;
}) {
  const router = useRouter();
  return (
    <Dialog
      title="Editar caso de prueba"
      description="Ajusta los pasos en lenguaje natural — un paso por línea."
      trigger={
        <Button size="sm" variant="ghost" aria-label="Editar caso de prueba">
          <Pencil className="size-3.5" strokeWidth={1.75} />
        </Button>
      }
    >
      {(close) => (
        <SpecForm
          specId={specId}
          appId={appId}
          title={title}
          steps={steps}
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
  specId,
  appId,
  title,
  steps,
  onDone,
  onCancel,
}: {
  specId: string;
  appId: string;
  title: string;
  steps: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [state, action, pending] = useActionState(updateTestSpecAction, initial);
  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={specId} />
      <input type="hidden" name="app_id" value={appId} />
      <Field label="Título">
        <Input name="title" defaultValue={title} autoFocus required />
      </Field>
      <Field label="Pasos" hint="Un paso por línea, en lenguaje natural">
        <Textarea
          name="steps"
          className="min-h-32 font-mono text-[13px]"
          defaultValue={steps}
          required
        />
      </Field>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
