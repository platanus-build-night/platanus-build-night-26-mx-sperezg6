import { AppWindow } from "lucide-react";
import { Topbar } from "@/components/shell/Topbar";
import { EmptyState } from "@/components/ui/EmptyState";
import { SetupNotice } from "@/components/ui/SetupNotice";
import { CreateAppDialog } from "@/components/forms/CreateAppDialog";
import { AppCardGrid } from "@/components/apps/AppCardGrid";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getApps, getClientOptions } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AppsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <>
        <Topbar title="Aplicaciones" />
        <div className="px-4 py-8 sm:px-8">
          <SetupNotice />
        </div>
      </>
    );
  }

  const [apps, clients] = await Promise.all([getApps(), getClientOptions()]);

  return (
    <>
      <Topbar title="Aplicaciones" action={<CreateAppDialog clients={clients} />} />
      <div className="px-4 py-8 sm:px-8">
        {apps.length === 0 ? (
          <EmptyState
            icon={AppWindow}
            title="Aún no hay aplicaciones"
            description="Registra la URL de una app de cliente y define las funcionalidades a testear."
            action={<CreateAppDialog clients={clients} />}
          />
        ) : (
          <AppCardGrid
            apps={apps.map((a) => ({
              id: a.id,
              name: a.name,
              clientName: a.client?.name ?? "—",
              baseUrl: a.base_url,
              imageUrl: a.image_url ?? null,
              featureCount: a.feature_count,
            }))}
          />
        )}
      </div>
    </>
  );
}
