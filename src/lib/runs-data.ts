import "server-only";

import { createServerSupabase } from "@/lib/supabase/server";
import type { RunRow, RunSpecRow, RunStepRow } from "@/lib/supabase/types";

export type RunListItem = RunRow & {
  agent: { id: string; name: string } | null;
  total: number;
  passed: number;
  failed: number;
};

export type RunSpecWithSteps = RunSpecRow & { steps: RunStepRow[] };

export type RunPayload = {
  run: (RunRow & { agent: { id: string; name: string; model_id: string } | null }) | null;
  specs: RunSpecWithSteps[];
};

export type LiveSpec = RunSpecRow & {
  run: { id: string; agent: { name: string } | null } | null;
  currentStep: string | null;
  doneSteps: number;
  totalSteps: number;
  latestShot: string | null;
};

export type RunFilters = { status?: string; agentId?: string; trigger?: string; since?: string };

// ── Runs list ─────────────────────────────────────────────────────────────────
export async function getRuns(filters: RunFilters = {}): Promise<RunListItem[]> {
  const sb = createServerSupabase();
  let q = sb
    .from("runs")
    .select("*, agent:agents(id, name), run_specs(status)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.agentId) q = q.eq("agent_id", filters.agentId);
  if (filters.trigger) q = q.eq("trigger", filters.trigger);
  if (filters.since) q = q.gte("created_at", filters.since);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => {
    const rec = r as Record<string, unknown>;
    const specs = (rec.run_specs as { status: string }[]) ?? [];
    return {
      ...(r as RunRow),
      agent: rec.agent as RunListItem["agent"],
      total: specs.length,
      passed: specs.filter((s) => s.status === "passed").length,
      failed: specs.filter((s) => s.status === "failed" || s.status === "error").length,
    };
  });
}

// ── Single run (with specs + steps) — used by page + polling API ───────────────
export async function getRunPayload(runId: string): Promise<RunPayload> {
  const sb = createServerSupabase();
  const { data: run } = await sb
    .from("runs")
    .select("*, agent:agents(id, name, model_id)")
    .eq("id", runId)
    .maybeSingle();
  if (!run) return { run: null, specs: [] };

  const { data: specs } = await sb
    .from("run_specs")
    .select("*")
    .eq("run_id", runId)
    .order("started_at", { ascending: true, nullsFirst: false });

  const specIds = (specs ?? []).map((s) => s.id as string);
  let stepsBySpec: Record<string, RunStepRow[]> = {};
  if (specIds.length > 0) {
    const { data: steps } = await sb
      .from("run_steps")
      .select("*")
      .in("run_spec_id", specIds)
      .order("idx", { ascending: true });
    stepsBySpec = (steps ?? []).reduce((acc, st) => {
      const key = st.run_spec_id as string;
      (acc[key] ??= []).push(st as RunStepRow);
      return acc;
    }, {} as Record<string, RunStepRow[]>);
  }

  return {
    run: run as RunPayload["run"],
    specs: (specs ?? []).map((s) => ({
      ...(s as RunSpecRow),
      steps: stepsBySpec[s.id as string] ?? [],
    })),
  };
}

// ── Live grid: active specs across all runs ───────────────────────────────────
export async function getLiveSpecs(): Promise<LiveSpec[]> {
  const sb = createServerSupabase();
  const { data: specs } = await sb
    .from("run_specs")
    .select("*, run:runs(id, agent:agents(name))")
    .in("status", ["queued", "running"])
    .order("started_at", { ascending: false, nullsFirst: false })
    .limit(24);

  const specIds = (specs ?? []).map((s) => s.id as string);
  let stepsBySpec: Record<string, RunStepRow[]> = {};
  if (specIds.length > 0) {
    const { data: steps } = await sb
      .from("run_steps")
      .select("*")
      .in("run_spec_id", specIds)
      .order("idx", { ascending: true });
    stepsBySpec = (steps ?? []).reduce((acc, st) => {
      const key = st.run_spec_id as string;
      (acc[key] ??= []).push(st as RunStepRow);
      return acc;
    }, {} as Record<string, RunStepRow[]>);
  }

  return (specs ?? []).map((s) => {
    const steps = stepsBySpec[s.id as string] ?? [];
    const running = steps.find((st) => st.status === "running");
    const done = steps.filter((st) => st.status === "passed" || st.status === "failed").length;
    const withShot = [...steps].reverse().find((st) => st.screenshot_url);
    return {
      ...(s as RunSpecRow),
      run: (s as Record<string, unknown>).run as LiveSpec["run"],
      currentStep: running?.description ?? null,
      doneSteps: done,
      totalSteps: steps.length,
      latestShot: withShot?.screenshot_url ?? null,
    };
  });
}
