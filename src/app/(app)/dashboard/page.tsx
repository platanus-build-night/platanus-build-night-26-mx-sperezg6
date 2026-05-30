import { Activity, Bot, Bug, CheckCircle2, Database, ShieldAlert } from "lucide-react";
import { Topbar } from "@/components/shell/Topbar";
import { SectionCard } from "@/components/ui/SectionCard";
import { SeverityBadge } from "@/components/ui/SeverityBadge";
import { Reveal } from "@/components/ui/Reveal";
import { Typewriter } from "@/components/ui/typewriter";
import { RunsTrendCard } from "@/components/dashboard/RunsTrendCard";
import { KpiRow } from "@/components/dashboard/KpiRow";
import { SetupNotice } from "@/components/ui/SetupNotice";
import { getDashboardData } from "@/lib/dashboard-data";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

const activityIcon: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  passed: CheckCircle2,
  failed: Bug,
  run: Activity,
  agent: Bot,
};

const greeting = () => {
  const h = new Date().getHours();
  if (h < 6) return "🌙 Ya es un poco tarde para trabajar, ¿no crees?";
  if (h < 13) return "☀️ ¿Tan rápido? Buenos días, Santiago";
  if (h < 20) return "🌤️ Santiago haz vuelto, buenas tardes";
  return "🔥 A darle duro, Santiago";
};

const today = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
}).format(new Date());

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) {
    return (
      <>
        <Topbar title="Inicio" />
        <div className="px-4 py-8 sm:px-8">
          <SetupNotice />
        </div>
      </>
    );
  }

  const { kpis, engine, failures, activity } = await getDashboardData();
  return (
    <>
      <Topbar title="Inicio" />

      <div className="px-4 py-8 sm:px-8">
        {/* Greeting */}
        <Reveal className="mb-8">
          <h2 className="text-display text-[2rem] font-medium sm:text-[2.75rem]">{greeting()}</h2>
          <p className="text-overline mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>{today}</span>
            <span className="text-faint">·</span>
            <Typewriter
              className="text-mono normal-case tracking-normal text-mute"
              words={[
                "6 agentes vigilando tu app",
                "checkout · login · búsqueda en prueba",
                "37 fallos detectados este mes",
                "navegadores en la nube, 24/7",
              ]}
              speed={55}
              delayBetweenWords={2200}
              cursorChar="▍"
            />
          </p>
        </Reveal>

        {/* KPI row */}
        <Reveal delay={0.06}>
          <KpiRow data={kpis} />
        </Reveal>

        {/* Engine status + coverage */}
        <Reveal delay={0.12} className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <RunsTrendCard />

          <div className="rounded-[var(--radius)] border border-line bg-surface p-6">
            <p className="text-display text-[3.5rem] leading-none text-faint">01</p>
            <h3 className="text-display mt-3 text-2xl font-medium">Motor de QA</h3>
            <p className="text-mono mt-3 flex items-center gap-2 text-xs uppercase tracking-wide text-ok">
              <span className="size-1.5 rounded-full bg-ok" /> Activo
            </p>

            <ul className="mt-6 space-y-3">
              {[
                { icon: Database, text: `${formatNumber(engine.runsToday)} ejecuciones hoy` },
                { icon: Bot, text: `${formatNumber(engine.agents)} agentes configurados` },
                { icon: ShieldAlert, text: `${formatNumber(engine.activeFailures)} fallos detectados` },
                { icon: Activity, text: `${formatNumber(engine.runningNow)} ejecutando ahora` },
              ].map(({ icon: Icon, text }, i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm text-mute">
                  <Icon className="size-4 shrink-0 text-faint" strokeWidth={1.5} />
                  <span className="text-mono text-xs uppercase tracking-wide">{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        {/* Priority failures + activity */}
        <Reveal delay={0.18} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SectionCard
            title="Fallos prioritarios"
            count={failures.length}
            footerHref="/runs"
            footerLabel="Ver todos los fallos"
          >
            {failures.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-mute">
                Sin fallos detectados todavía.
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {failures.map((f, i) => (
                  <li key={i} className="flex items-start gap-3 px-5 py-4">
                    <ShieldAlert className="mt-0.5 size-4 shrink-0 text-danger" strokeWidth={1.5} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug">{f.title}</p>
                      <p className="mt-1 text-sm text-mute">{f.summary}</p>
                      <p className="text-mono mt-1 text-[11px] uppercase tracking-wide text-faint">
                        {f.agent}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <SeverityBadge severity={f.severity} />
                      <span className="text-mono text-[11px] text-faint">{f.when}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            title="Actividad reciente"
            footerHref="/runs"
            footerLabel="Ver toda la actividad"
          >
            {activity.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-mute">
                Aún no hay actividad.
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {activity.map((a, i) => {
                  const Icon = activityIcon[a.kind] ?? Activity;
                  return (
                    <li key={i} className="flex items-start gap-3 px-5 py-4">
                      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border border-line">
                        <Icon className="size-3.5 text-mute" strokeWidth={1.5} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug">{a.title}</p>
                        <p className="mt-0.5 text-sm text-mute">{a.desc}</p>
                      </div>
                      <span className="text-mono shrink-0 text-[11px] text-faint">{a.when}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </Reveal>
      </div>
    </>
  );
}
