import { Check, X, Bot, Cloud, Database, Sparkles } from "lucide-react";
import { Topbar } from "@/components/shell/Topbar";
import { modelLabel, DEFAULT_MODEL_ID } from "@/lib/models";

export const dynamic = "force-dynamic";

type Row = { label: string; value?: string | null; secret?: boolean };

function Value({ row }: { row: Row }) {
  const present = Boolean(row.value);
  if (row.secret) {
    return present ? (
      <span className="inline-flex items-center gap-1 text-mono text-xs text-ok">
        <Check className="size-3.5" strokeWidth={2} /> Configurado
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-mono text-xs text-danger">
        <X className="size-3.5" strokeWidth={2} /> Falta
      </span>
    );
  }
  return present ? (
    <span className="text-mono max-w-[60%] truncate text-xs text-ink">{row.value}</span>
  ) : (
    <span className="text-mono text-xs text-faint">—</span>
  );
}

function Section({
  icon: Icon,
  title,
  rows,
}: {
  icon: typeof Cloud;
  title: string;
  rows: Row[];
}) {
  return (
    <section className="rounded-[var(--radius)] border border-line bg-surface">
      <div className="flex items-center gap-2 border-b border-line px-5 py-4">
        <Icon className="size-4 text-faint" strokeWidth={1.5} />
        <h2 className="text-sm font-medium">{title}</h2>
      </div>
      <dl className="divide-y divide-line">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-4 px-5 py-3">
            <dt className="text-sm text-mute">{r.label}</dt>
            <dd className="min-w-0 text-right">
              <Value row={r} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default function SettingsPage() {
  const mode = process.env.APP_MODE ?? "mock";

  return (
    <>
      <Topbar title="Configuración" />
      <div className="px-4 py-8 sm:px-8">
        <div className="mb-6 max-w-2xl">
          <h2 className="text-display text-2xl font-medium">Configuración del sistema</h2>
          <p className="mt-1 text-sm text-mute">
            Estado de la integración con AWS Bedrock AgentCore y Supabase. Los valores se
            definen por variables de entorno; los secretos solo se muestran como configurados.
          </p>
        </div>

        <div className="grid max-w-2xl grid-cols-1 gap-4">
          <Section
            icon={Bot}
            title="General"
            rows={[
              { label: "Modo de ejecución", value: mode === "real" ? "Real (AgentCore)" : "Simulado (mock)" },
              { label: "Región AWS", value: process.env.AWS_REGION },
              { label: "Modelo por defecto", value: modelLabel(DEFAULT_MODEL_ID) },
            ]}
          />

          <Section
            icon={Cloud}
            title="AWS Bedrock AgentCore"
            rows={[
              { label: "Browser ID", value: process.env.AGENTCORE_BROWSER_ID },
              { label: "Memory ID", value: process.env.AGENTCORE_MEMORY_ID },
              { label: "Rol de ejecución", value: process.env.AGENTCORE_EXEC_ROLE_ARN, secret: true },
              { label: "Código del agente (S3)", value: process.env.AGENT_CODE_S3_BUCKET ? "Configurado" : null },
              { label: "Credenciales AWS", value: process.env.AWS_SECRET_ACCESS_KEY, secret: true },
            ]}
          />

          <Section
            icon={Database}
            title="Supabase"
            rows={[
              { label: "Proyecto (URL)", value: process.env.NEXT_PUBLIC_SUPABASE_URL },
              { label: "Clave anónima", value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, secret: true },
              { label: "Clave de servicio", value: process.env.SUPABASE_SERVICE_ROLE_KEY, secret: true },
            ]}
          />

          <Section
            icon={Sparkles}
            title="Memoria de agentes"
            rows={[
              { label: "Almacén de memoria", value: process.env.AGENTCORE_MEMORY_ID ? "Activo" : null },
              { label: "Estrategias", value: "semántica · resumen · preferencias" },
            ]}
          />
        </div>
      </div>
    </>
  );
}
