import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Topbar } from "@/components/shell/Topbar";
import { RunDetailLive } from "@/components/runs/RunDetailLive";
import { RerunButton } from "@/components/runs/RerunButton";
import { StopRunButton } from "@/components/runs/StopRunButton";
import { getRunPayload } from "@/lib/runs-data";
import { modelLabel } from "@/lib/models";

const ACTIVE_STATUSES = ["queued", "running"];

export const dynamic = "force-dynamic";

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const payload = await getRunPayload(id);
  if (!payload.run) notFound();
  const { run } = payload;

  const date = new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(run.created_at));

  return (
    <>
      <Topbar
        title="Ejecución"
        action={
          ACTIVE_STATUSES.includes(run.status) ? (
            <StopRunButton runId={run.id} />
          ) : (
            <RerunButton runId={run.id} />
          )
        }
      />
      <div className="px-4 py-8 sm:px-8">
        <Link
          href="/runs"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-mute hover:text-ink"
        >
          <ArrowLeft className="size-4" /> Ejecuciones
        </Link>

        <div className="mb-8">
          <h2 className="text-display text-3xl font-medium">{run.label ?? "Ejecución"}</h2>
          <p className="text-mono mt-2 text-xs uppercase tracking-wide text-mute">
            {run.agent?.name ?? "—"}
            {run.agent?.model_id ? ` · ${modelLabel(run.agent.model_id)}` : ""} · {run.trigger} · {date}
          </p>
        </div>

        <RunDetailLive initial={payload} runId={run.id} />
      </div>
    </>
  );
}
