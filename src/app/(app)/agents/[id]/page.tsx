import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bot, Sparkles } from "lucide-react";
import { Topbar } from "@/components/shell/Topbar";
import { AgentRunControl } from "@/components/runs/AgentRunControl";
import { DeleteAgentButton } from "@/components/agents/DeleteAgentButton";
import { getAgent } from "@/lib/data";
import { getAgentMemory } from "@/lib/agentcore/memory";
import { modelLabel } from "@/lib/models";

export const dynamic = "force-dynamic";

const runtimeLabel: Record<string, string> = {
  none: "Sin runtime",
  provisioning: "Aprovisionando…",
  ready: "Listo",
  failed: "Falló",
};

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agent = await getAgent(id);
  if (!agent) notFound();

  const memory = await getAgentMemory(id, agent.client_id);

  return (
    <>
      <Topbar
        title={agent.name}
        action={
          <div className="flex items-center gap-2">
            <DeleteAgentButton agentId={agent.id} agentName={agent.name} />
            <AgentRunControl agentId={agent.id} initialStatus={agent.runtime_status ?? "none"} />
          </div>
        }
      />
      <div className="px-4 py-8 sm:px-8">
        <Link
          href="/agents"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-mute hover:text-ink"
        >
          <ArrowLeft className="size-4" /> Agentes
        </Link>

        <div className="mb-8 flex items-center gap-4">
          <span className="grid size-12 place-items-center rounded-[var(--radius-sm)] border border-line">
            <Bot className="size-6" strokeWidth={1.5} />
          </span>
          <div>
            <h2 className="text-display text-3xl font-medium">{agent.name}</h2>
            <p className="mt-1 text-sm text-mute">{modelLabel(agent.model_id)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="rounded-[var(--radius)] border border-line bg-surface p-5">
            <h3 className="text-overline mb-4">Configuración</h3>
            <dl className="space-y-3 text-sm">
              <Row label="Cliente" value={agent.client?.name ?? "—"} />
              <Row label="Funcionalidad objetivo" value={agent.default_feature?.name ?? "—"} />
              <Row label="Modelo" value={modelLabel(agent.model_id)} />
              <Row label="Runtime" value={runtimeLabel[agent.runtime_status] ?? agent.runtime_status} />
            </dl>
            {agent.instructions && (
              <>
                <h4 className="text-overline mb-2 mt-5">Instrucciones</h4>
                <p className="text-sm text-mute">{agent.instructions}</p>
              </>
            )}
          </section>

          <section className="rounded-[var(--radius)] border border-line bg-surface p-5">
            <h3 className="text-overline mb-4 flex items-center gap-1.5">
              <Sparkles className="size-3.5" strokeWidth={1.5} /> Lo que sabe sobre esta app
            </h3>
            {memory.length === 0 ? (
              <p className="text-sm text-mute">
                La memoria del agente (AgentCore Memory) se irá poblando con lo que aprende en cada
                ejecución: el flujo de login, la ubicación de botones, áreas frágiles y fallos
                pasados. Disponible tras las primeras ejecuciones.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {memory.map((m, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <span
                      className={
                        "text-mono mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide " +
                        (m.kind === "fact" ? "bg-info-bg text-info" : "bg-surface-2 text-mute")
                      }
                    >
                      {m.kind === "fact" ? "App" : "Pref"}
                    </span>
                    <span className="text-ink">{m.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line pb-3 last:border-0 last:pb-0">
      <dt className="text-mute">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  );
}
