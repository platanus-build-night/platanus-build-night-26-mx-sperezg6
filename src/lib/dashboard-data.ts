import "server-only";

import { createServerSupabase } from "@/lib/supabase/server";
import type { Severity } from "@/components/ui/SeverityBadge";

export type ActivityKind = "passed" | "failed" | "agent" | "run";

export type DashboardData = {
  kpis: { testsRun: number; failures: number; agents: number; successRate: number };
  engine: { runsToday: number; agents: number; activeFailures: number; runningNow: number };
  failures: { title: string; agent: string; summary: string; when: string; severity: Severity }[];
  activity: { kind: ActivityKind; title: string; desc: string; when: string }[];
};

function relTime(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "hace un momento";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function count(
  sb: ReturnType<typeof createServerSupabase>,
  table: string,
  build: (q: any) => any,
): Promise<number> {
  const q = build(sb.from(table).select("*", { count: "exact", head: true }));
  const { count: c } = await q;
  return c ?? 0;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export type TrendPeriod = "1D" | "1W" | "1M" | "3M" | "1Y";

export type RunsTrend = {
  points: { label: string; runs: number }[];
  total: number;
  deltaPct: number;
  agents: { name: string; runs: number; passRate: number }[];
};

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/** Bucket config per period: count of buckets + bucket size in ms + labeler. */
function bucketing(period: TrendPeriod) {
  const HOUR = 3600_000;
  const DAY = 24 * HOUR;
  switch (period) {
    case "1D":
      return { count: 24, size: HOUR, label: (d: Date) => `${String(d.getHours()).padStart(2, "0")}:00` };
    case "1W":
      return { count: 7, size: DAY, label: (d: Date) => DAYS[d.getDay()] };
    case "1M":
      return { count: 30, size: DAY, label: (d: Date) => `${d.getDate()}` };
    case "3M":
      return { count: 12, size: 7 * DAY, label: (d: Date) => `${d.getDate()}/${d.getMonth() + 1}` };
    case "1Y":
      return { count: 12, size: 30 * DAY, label: (d: Date) => MONTHS[d.getMonth()] };
  }
}

export async function getRunsTrend(period: TrendPeriod): Promise<RunsTrend> {
  const sb = createServerSupabase();
  const { count, size, label } = bucketing(period);
  const now = Date.now();
  const windowMs = count * size;
  const windowStart = now - windowMs;
  const prevStart = windowStart - windowMs;

  // Fetch runs over the current + previous window (for the delta).
  const { data: rows } = await sb
    .from("runs")
    .select("created_at, status, agent:agents(name)")
    .gte("created_at", new Date(prevStart).toISOString())
    .order("created_at", { ascending: true });

  const runs = rows ?? [];

  // Build empty buckets aligned to bucket boundaries ending now.
  const points = Array.from({ length: count }, (_, i) => ({
    label: label(new Date(windowStart + i * size)),
    runs: 0,
  }));

  let total = 0;
  let prevTotal = 0;
  const agentRuns: Record<string, { runs: number; passed: number }> = {};

  for (const r of runs) {
    const rec = r as Record<string, unknown>;
    const t = new Date(rec.created_at as string).getTime();
    if (t >= windowStart) {
      const idx = Math.min(count - 1, Math.floor((t - windowStart) / size));
      points[idx].runs += 1;
      total += 1;
      const name = (rec.agent as { name?: string } | null)?.name ?? "Agente";
      const a = (agentRuns[name] ??= { runs: 0, passed: 0 });
      a.runs += 1;
      if (rec.status === "passed") a.passed += 1;
    } else if (t >= prevStart) {
      prevTotal += 1;
    }
  }

  const deltaPct = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : 0;
  const agents = Object.entries(agentRuns)
    .map(([name, v]) => ({ name, runs: v.runs, passRate: v.runs ? Math.round((v.passed / v.runs) * 100) : 0 }))
    .sort((a, b) => b.runs - a.runs)
    .slice(0, 3);

  return { points, total, deltaPct, agents };
}

export async function getDashboardData(): Promise<DashboardData> {
  const sb = createServerSupabase();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [testsRun, passed, failed, agents, runningNow, runsToday] = await Promise.all([
    count(sb, "run_specs", (q) => q.neq("status", "queued")),
    count(sb, "run_specs", (q) => q.eq("status", "passed")),
    count(sb, "run_specs", (q) => q.in("status", ["failed", "error"])),
    count(sb, "agents", (q) => q),
    count(sb, "runs", (q) => q.eq("status", "running")),
    count(sb, "runs", (q) => q.gte("created_at", startOfDay.toISOString())),
  ]);

  const denom = passed + failed;
  const successRate = denom > 0 ? Math.round((passed / denom) * 1000) / 10 : 0;

  // Priority failures — most recent failed/errored specs.
  const { data: failRows } = await sb
    .from("run_specs")
    .select("title, summary, ended_at, run:runs(agent:agents(name))")
    .in("status", ["failed", "error"])
    .order("ended_at", { ascending: false, nullsFirst: false })
    .limit(3);

  const severities: Severity[] = ["critico", "alto", "medio"];
  const failures = (failRows ?? []).map((r, i) => {
    const rec = r as Record<string, unknown>;
    const run = rec.run as { agent?: { name?: string } } | null;
    return {
      title: (rec.title as string) ?? "Caso de prueba",
      agent: run?.agent?.name ?? "—",
      summary: (rec.summary as string) ?? "Fallo detectado durante la ejecución.",
      when: relTime(rec.ended_at as string | null),
      severity: severities[i] ?? "bajo",
    };
  });

  // Recent activity — latest runs.
  const { data: runRows } = await sb
    .from("runs")
    .select("status, summary, label, created_at, agent:agents(name)")
    .order("created_at", { ascending: false })
    .limit(5);

  const activity = (runRows ?? []).map((r) => {
    const rec = r as Record<string, unknown>;
    const agent = (rec.agent as { name?: string } | null)?.name ?? "Agente";
    const status = rec.status as string;
    const kind: ActivityKind =
      status === "passed" ? "passed" : status === "failed" || status === "error" ? "failed" : "run";
    const title =
      status === "passed"
        ? "Ejecución aprobada"
        : status === "failed" || status === "error"
          ? "Fallo detectado"
          : status === "running"
            ? "Ejecución en curso"
            : "Ejecución creada";
    return {
      kind,
      title,
      desc: `${agent}${rec.summary ? ` · ${rec.summary}` : ""}`,
      when: relTime(rec.created_at as string | null),
    };
  });

  return {
    kpis: { testsRun, failures: failed, agents, successRate },
    engine: { runsToday, agents, activeFailures: failed, runningNow },
    failures,
    activity,
  };
}
