import { Building2 } from "lucide-react";
import { Topbar } from "@/components/shell/Topbar";
import { EmptyState } from "@/components/ui/EmptyState";
import { SetupNotice } from "@/components/ui/SetupNotice";
import { CreateClientDialog } from "@/components/forms/CreateClientDialog";
import { ClientCardGrid } from "@/components/clients/ClientCardGrid";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getClients } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <>
        <Topbar title="Clientes" />
        <div className="px-4 py-8 sm:px-8">
          <SetupNotice />
        </div>
      </>
    );
  }

  const clients = await getClients();

  return (
    <>
      <Topbar title="Clientes" action={<CreateClientDialog />} />
      <div className="px-4 py-8 sm:px-8">
        {clients.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Aún no hay clientes"
            description="Registra una empresa cliente para empezar a gestionar sus aplicaciones y agentes de QA."
            action={<CreateClientDialog />}
          />
        ) : (
          <ClientCardGrid
            clients={clients.map((c) => ({
              id: c.id,
              name: c.name,
              website: c.website,
              imageUrl: c.logo_url,
              appCount: c.app_count,
              agentCount: c.agent_count,
            }))}
          />
        )}
      </div>
    </>
  );
}
