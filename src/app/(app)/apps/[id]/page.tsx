import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FlaskConical, Layers } from "lucide-react";
import { Topbar } from "@/components/shell/Topbar";
import { EmptyState } from "@/components/ui/EmptyState";
import { CreateFeatureDialog } from "@/components/forms/CreateFeatureDialog";
import { CreateTestSpecDialog } from "@/components/forms/CreateTestSpecDialog";
import { DeleteFeatureButton } from "@/components/forms/DeleteFeatureButton";
import { DeleteTestSpecButton } from "@/components/forms/DeleteTestSpecButton";
import { EditTestSpecDialog } from "@/components/forms/EditTestSpecDialog";
import { getApp, getFeatures, getTestSpecs } from "@/lib/data";

export default async function AppDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const app = await getApp(id);
  if (!app) notFound();

  const features = await getFeatures(id);
  const specsByFeature = await Promise.all(features.map((f) => getTestSpecs(f.id)));

  return (
    <>
      <Topbar title={app.name} action={<CreateFeatureDialog appId={id} />} />
      <div className="px-4 py-8 sm:px-8">
        <Link
          href={app.client ? `/clients/${app.client.id}` : "/apps"}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-mute hover:text-ink"
        >
          <ArrowLeft className="size-4" /> {app.client?.name ?? "Aplicaciones"}
        </Link>

        <div className="mb-8">
          <h2 className="text-display text-3xl font-medium">{app.name}</h2>
          <p className="mt-1 text-sm text-mute">{app.base_url}</p>
        </div>

        {features.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="Sin funcionalidades"
            description="Define una funcionalidad (ej. Checkout, Login) y agrégale casos de prueba."
            action={<CreateFeatureDialog appId={id} />}
          />
        ) : (
          <div className="space-y-4">
            {features.map((f, i) => {
              const specs = specsByFeature[i];
              return (
                <section
                  key={f.id}
                  className="rounded-[var(--radius)] border border-line bg-surface"
                >
                  <div className="flex items-start justify-between border-b border-line px-5 py-4">
                    <div>
                      <h3 className="font-medium">{f.name}</h3>
                      {f.description && (
                        <p className="mt-0.5 text-sm text-mute">{f.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <CreateTestSpecDialog featureId={f.id} />
                      <DeleteFeatureButton featureId={f.id} featureName={f.name} appId={id} />
                    </div>
                  </div>

                  {specs.length === 0 ? (
                    <p className="px-5 py-4 text-sm text-mute">
                      Sin casos de prueba todavía.
                    </p>
                  ) : (
                    <ul className="divide-y divide-line">
                      {specs.map((s) => (
                        <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                          <FlaskConical className="size-4 shrink-0 text-faint" strokeWidth={1.5} />
                          <span className="flex-1 text-sm">{s.title}</span>
                          <span className="text-mono text-[11px] uppercase tracking-wide text-faint">
                            {s.steps_json.length} pasos
                          </span>
                          <EditTestSpecDialog
                            specId={s.id}
                            appId={id}
                            title={s.title}
                            steps={s.steps_json.map((st) => st.description).join("\n")}
                          />
                          <DeleteTestSpecButton specId={s.id} specTitle={s.title} appId={id} />
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
