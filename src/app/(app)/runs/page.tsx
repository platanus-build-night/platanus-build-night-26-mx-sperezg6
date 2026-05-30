import Link from "next/link";
import { ListChecks } from "lucide-react";
import { Topbar } from "@/components/shell/Topbar";
import { EmptyState } from "@/components/ui/EmptyState";
import { SetupNotice } from "@/components/ui/SetupNotice";
import { StatusPill } from "@/components/ui/StatusPill";
import { StopRunButton } from "@/components/runs/StopRunButton";
import { RunsFilters } from "@/components/runs/RunsFilters";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getRuns } from "@/lib/runs-data";
import { getAgentOptions } from "@/lib/data";

const ACTIVE_STATUSES = ["queued", "running"];

export const dynamic = "force-dynamic";

const triggerLabel: Record<string, string> = {
  manual: "Manual",
  batch: "Lote",
  rerun: "Re-ejecución",
  scheduled: "Programada",
};

export default async function RunsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; agent?: string; trigger?: string; range?: string }>;
}) {
  if (!isSupabaseConfigured()) {
    return (
      <>
        <Topbar title="Ejecuciones" />
        <div className="px-4 py-8 sm:px-8">
          <SetupNotice />
        </div>
      </>
    );
  }

  const { status, agent, trigger, range } = await searchParams;
  const since =
    range === "today"
      ? new Date(new Date().setHours(0, 0, 0, 0)).toISOString()
      : range === "7d"
        ? new Date(Date.now() - 7 * 86400_000).toISOString()
        : range === "30d"
          ? new Date(Date.now() - 30 * 86400_000).toISOString()
          : undefined;
  const [runs, agents] = await Promise.all([
    getRuns({ status, agentId: agent, trigger, since }),
    getAgentOptions(),
  ]);
  const filtered = Boolean(status || agent || trigger || range);

  return (
    <>
      <Topbar title="Ejecuciones" />
      <div className="px-4 py-8 sm:px-8">
        <RunsFilters agents={agents} />
        {runs.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title={filtered ? "Sin ejecuciones con esos filtros" : "Aún no hay ejecuciones"}
            description={
              filtered
                ? "Prueba con otros filtros o límpialos para ver todo el historial."
                : "Ejecuta un agente desde su página para ver aquí el historial con resultados."
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-[var(--radius)] border border-line bg-surface">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="text-overline px-5 py-3 font-normal">Agente</th>
                  <th className="text-overline px-5 py-3 font-normal">Origen</th>
                  <th className="text-overline px-5 py-3 font-normal">Casos</th>
                  <th className="text-overline px-5 py-3 font-normal">Estado</th>
                  <th className="text-overline px-5 py-3 font-normal">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {runs.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-surface-2">
                    <td className="px-5 py-3">
                      <Link href={`/runs/${r.id}`} className="font-medium hover:underline">
                        {r.label ?? r.agent?.name ?? "Ejecución"}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-mute">{triggerLabel[r.trigger] ?? r.trigger}</td>
                    <td className="text-mono px-5 py-3 text-xs text-mute">
                      {r.passed}✓ {r.failed > 0 ? `${r.failed}✗ ` : ""}/ {r.total}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <StatusPill status={r.status} />
                        {ACTIVE_STATUSES.includes(r.status) && <StopRunButton runId={r.id} />}
                      </div>
                    </td>
                    <td className="text-mono px-5 py-3 text-xs text-faint">
                      {new Intl.DateTimeFormat("es-ES", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(r.created_at))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
