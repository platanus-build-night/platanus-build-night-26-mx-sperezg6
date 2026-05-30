import Link from "next/link";
import { notFound } from "next/navigation";
import { AppWindow, ArrowLeft } from "lucide-react";
import { Topbar } from "@/components/shell/Topbar";
import { EmptyState } from "@/components/ui/EmptyState";
import { CreateAppDialog } from "@/components/forms/CreateAppDialog";
import { getApps, getClient } from "@/lib/data";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await getClient(id);
  if (!client) notFound();

  const apps = await getApps(id);

  return (
    <>
      <Topbar
        title={client.name}
        action={<CreateAppDialog clients={[]} fixedClientId={id} />}
      />
      <div className="px-4 py-8 sm:px-8">
        <Link
          href="/clients"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-mute hover:text-ink"
        >
          <ArrowLeft className="size-4" /> Clientes
        </Link>

        <div className="mb-8">
          <h2 className="text-display text-3xl font-medium">{client.name}</h2>
          {client.website && <p className="mt-1 text-sm text-mute">{client.website}</p>}
        </div>

        <h3 className="text-overline mb-3">Aplicaciones</h3>
        {apps.length === 0 ? (
          <EmptyState
            icon={AppWindow}
            title="Sin aplicaciones"
            description="Agrega la primera app de este cliente para definir funcionalidades y testearlas."
            action={<CreateAppDialog clients={[]} fixedClientId={id} />}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {apps.map((a) => (
              <Link
                key={a.id}
                href={`/apps/${a.id}`}
                className="rounded-[var(--radius)] border border-line bg-surface p-5 transition-colors hover:bg-surface-2"
              >
                <p className="font-medium">{a.name}</p>
                <p className="mt-0.5 truncate text-xs text-mute">{a.base_url}</p>
                <p className="text-mono mt-3 text-[11px] uppercase tracking-wide text-mute">
                  {a.feature_count} funcionalidades
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
