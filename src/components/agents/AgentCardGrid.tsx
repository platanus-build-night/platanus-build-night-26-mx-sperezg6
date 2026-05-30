"use client";

import { useEffect, useRef, useState } from "react";
import { Bot } from "lucide-react";
import { EntityCard, EntityCardGrid } from "@/components/ui/EntityCard";
import { AgentCardMenu } from "@/components/agents/AgentCardMenu";

export type RuntimeStatus = "none" | "provisioning" | "ready" | "failed";

export type AgentCardData = {
  id: string;
  name: string;
  modelLabel: string;
  clientName: string;
  featureName: string;
  imageUrl: string | null;
  runtimeStatus: RuntimeStatus;
};

const runtimeLabel: Record<RuntimeStatus, string> = {
  none: "Sin runtime",
  provisioning: "Aprovisionando…",
  ready: "Listo",
  failed: "Runtime falló",
};

const runtimeTone: Record<RuntimeStatus, "ok" | "warn" | "danger" | "muted"> = {
  none: "muted",
  provisioning: "warn",
  ready: "ok",
  failed: "danger",
};

export function AgentCardGrid({ agents }: { agents: AgentCardData[] }) {
  const [items, setItems] = useState(agents);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep in sync if the server passes new data (e.g. after navigation).
  useEffect(() => setItems(agents), [agents]);

  // Auto-refresh any provisioning agents until their runtime is ready/failed.
  useEffect(() => {
    const provisioning = items.filter((a) => a.runtimeStatus === "provisioning");
    if (provisioning.length === 0) return;

    const tick = async () => {
      const updates = await Promise.all(
        provisioning.map(async (a) => {
          try {
            const res = await fetch(`/api/agents/${a.id}/runtime-status`, { cache: "no-store" });
            if (!res.ok) return null;
            const status = (await res.json()).status as RuntimeStatus;
            return status && status !== a.runtimeStatus ? { id: a.id, status } : null;
          } catch {
            return null;
          }
        }),
      );
      const changed = updates.filter(Boolean) as { id: string; status: RuntimeStatus }[];
      if (changed.length > 0) {
        setItems((prev) =>
          prev.map((a) => {
            const u = changed.find((c) => c.id === a.id);
            return u ? { ...a, runtimeStatus: u.status } : a;
          }),
        );
      }
    };

    timer.current = setInterval(tick, 5000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [items]);

  return (
    <EntityCardGrid>
      {items.map((a) => (
        <EntityCard
          key={a.id}
          href={`/agents/${a.id}`}
          icon={Bot}
          title={a.name}
          subtitle={a.modelLabel}
          imageUrl={a.imageUrl}
          badges={["Agente"]}
          statusBadge={{ label: runtimeLabel[a.runtimeStatus], tone: runtimeTone[a.runtimeStatus] }}
          action={<AgentCardMenu agentId={a.id} agentName={a.name} />}
          meta={[
            { label: "Cliente", value: a.clientName },
            { label: "Funcionalidad", value: a.featureName },
          ]}
          cta="Ver agente"
        />
      ))}
    </EntityCardGrid>
  );
}
