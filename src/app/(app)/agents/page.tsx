import { Bot } from "lucide-react";
import { Topbar } from "@/components/shell/Topbar";
import { EmptyState } from "@/components/ui/EmptyState";
import { SetupNotice } from "@/components/ui/SetupNotice";
import { CreateAgentDialog } from "@/components/forms/CreateAgentDialog";
import { AgentCardGrid } from "@/components/agents/AgentCardGrid";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getAgents, getClientOptions, getFeatureOptions } from "@/lib/data";
import { modelLabel } from "@/lib/models";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <>
        <Topbar title="Agentes" />
        <div className="px-4 py-8 sm:px-8">
          <SetupNotice />
        </div>
      </>
    );
  }

  const [agents, clients, features] = await Promise.all([
    getAgents(),
    getClientOptions(),
    getFeatureOptions(),
  ]);

  return (
    <>
      <Topbar
        title="Agentes"
        action={<CreateAgentDialog clients={clients} features={features} />}
      />
      <div className="px-4 py-8 sm:px-8">
        {agents.length === 0 ? (
          <EmptyState
            icon={Bot}
            title="Aún no hay agentes"
            description="Crea tu primer agente de QA: elige modelo, funcionalidad objetivo e instrucciones."
            action={<CreateAgentDialog clients={clients} features={features} />}
          />
        ) : (
          <AgentCardGrid
            agents={agents.map((a) => ({
              id: a.id,
              name: a.name,
              modelLabel: modelLabel(a.model_id),
              clientName: a.client?.name ?? "—",
              featureName: a.default_feature?.name ?? "—",
              imageUrl: a.image_url ?? null,
              runtimeStatus: a.runtime_status ?? "none",
            }))}
          />
        )}
      </div>
    </>
  );
}
