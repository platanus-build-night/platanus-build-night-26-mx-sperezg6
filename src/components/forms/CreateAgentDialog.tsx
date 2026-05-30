"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { ModelSelector } from "@/components/ui/ModelSelector";
import { DEFAULT_MODEL_ID } from "@/lib/models";
import { createAgentAction, type ActionState } from "@/lib/actions";

const initial: ActionState = { ok: false };

type ClientOption = { id: string; name: string };
type FeatureOption = { id: string; name: string; appName: string; clientName: string };

export function CreateAgentDialog({
  clients,
  features,
}: {
  clients: ClientOption[];
  features: FeatureOption[];
}) {
  const router = useRouter();
  return (
    <Dialog
      title="Crear agente"
      description="Un agente es una persona de QA: modelo, instrucciones y memoria propia."
      trigger={
        <Button>
          <Plus className="size-4" strokeWidth={2} /> Crear agente
        </Button>
      }
    >
      {(close) => (
        <AgentForm
          clients={clients}
          features={features}
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

function AgentForm({
  clients,
  features,
  onDone,
  onCancel,
}: {
  clients: ClientOption[];
  features: FeatureOption[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [state, action, pending] = useActionState(createAgentAction, initial);
  const [modelId, setModelId] = useState(DEFAULT_MODEL_ID);
  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="space-y-4">
      <Field label="Nombre">
        <Input name="name" placeholder="Agente de Checkout" autoFocus required />
      </Field>

      <Field label="Modelo" hint="Modelo de Bedrock que razona y conduce el navegador">
        <ModelSelector name="model_id" value={modelId} onChange={setModelId} />
      </Field>

      <Field label="Cliente" hint="Opcional">
        <Select name="client_id" defaultValue="">
          <option value="">Sin cliente</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Funcionalidad objetivo" hint="Opcional — qué prueba por defecto">
        <Select name="default_feature_id" defaultValue="">
          <option value="">Sin funcionalidad</option>
          {features.map((f) => (
            <option key={f.id} value={f.id}>
              {f.clientName} · {f.appName} · {f.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Instrucciones" hint="Opcional — cómo debe comportarse">
        <Textarea
          name="instructions"
          placeholder="Prueba siempre casos límite y valida los mensajes de error."
        />
      </Field>

      <Field label="Imagen" hint="Opcional — URL para la portada de la tarjeta">
        <Input name="image_url" type="url" placeholder="https://…/imagen.jpg" />
      </Field>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Creando…" : "Crear agente"}
        </Button>
      </div>
    </form>
  );
}
