"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { startRunner } from "@/lib/runner";

export type RunResult = { ok: boolean; runId?: string; error?: string };

/**
 * Start a run for an agent: gathers the test specs of its default feature,
 * creates the run + run_specs, and kicks off the (mock) executor.
 */
export async function startRunForAgentAction(agentId: string): Promise<RunResult> {
  const sb = createServerSupabase();

  const { data: agent } = await sb
    .from("agents")
    .select("id, name, default_feature_id")
    .eq("id", agentId)
    .maybeSingle();
  if (!agent) return { ok: false, error: "Agente no encontrado" };
  if (!agent.default_feature_id)
    return { ok: false, error: "El agente no tiene una funcionalidad objetivo" };

  const { data: specs } = await sb
    .from("test_specs")
    .select("id, title")
    .eq("feature_id", agent.default_feature_id);
  if (!specs || specs.length === 0)
    return { ok: false, error: "La funcionalidad objetivo no tiene casos de prueba" };

  const { data: run, error: runErr } = await sb
    .from("runs")
    .insert({
      agent_id: agentId,
      trigger: specs.length > 1 ? "batch" : "manual",
      status: "queued",
      label: agent.name,
    })
    .select("id")
    .single();
  if (runErr || !run) return { ok: false, error: runErr?.message ?? "No se pudo crear la ejecución" };

  const { error: specErr } = await sb.from("run_specs").insert(
    specs.map((s) => ({ run_id: run.id, test_spec_id: s.id, title: s.title, status: "queued" })),
  );
  if (specErr) return { ok: false, error: specErr.message };

  startRunner(run.id);
  revalidatePath("/runs");
  revalidatePath("/live");
  return { ok: true, runId: run.id };
}

/**
 * Stop an in-flight run: marks the run and any non-terminal specs as `cancelled`.
 * The mock executor checks this status cooperatively and aborts its step loop.
 * Falls back to `error` if migration 0003 (the `cancelled` status) isn't applied.
 */
export async function stopRunAction(runId: string): Promise<RunResult> {
  const sb = createServerSupabase();
  const active = ["queued", "running"];
  const endedAt = new Date().toISOString();

  // Try the proper `cancelled` status; fall back to `error` pre-migration.
  let status = "cancelled";
  let res = await sb
    .from("runs")
    .update({ status, ended_at: endedAt, summary: "Detenido por el usuario" })
    .eq("id", runId)
    .in("status", active);
  if (res.error) {
    status = "error";
    res = await sb
      .from("runs")
      .update({ status, ended_at: endedAt, summary: "Detenido por el usuario" })
      .eq("id", runId)
      .in("status", active);
    if (res.error) return { ok: false, error: res.error.message };
  }

  await sb
    .from("run_specs")
    .update({ status, ended_at: endedAt, summary: "Detenido por el usuario" })
    .eq("run_id", runId)
    .in("status", active);

  revalidatePath("/runs");
  revalidatePath(`/runs/${runId}`);
  revalidatePath("/live");
  return { ok: true, runId };
}

/** Re-run a past run: clones its spec set into a NEW run (immutable history). */
export async function rerunRunAction(runId: string): Promise<RunResult> {
  const sb = createServerSupabase();

  const { data: src } = await sb
    .from("runs")
    .select("id, agent_id, label")
    .eq("id", runId)
    .maybeSingle();
  if (!src) return { ok: false, error: "Ejecución no encontrada" };

  const { data: specs } = await sb
    .from("run_specs")
    .select("test_spec_id, title")
    .eq("run_id", runId);
  if (!specs || specs.length === 0) return { ok: false, error: "La ejecución no tiene casos" };

  const { data: run, error: runErr } = await sb
    .from("runs")
    .insert({
      agent_id: src.agent_id,
      trigger: "rerun",
      rerun_of: runId,
      status: "queued",
      label: src.label,
    })
    .select("id")
    .single();
  if (runErr || !run) return { ok: false, error: runErr?.message ?? "No se pudo recrear la ejecución" };

  await sb.from("run_specs").insert(
    specs.map((s) => ({
      run_id: run.id,
      test_spec_id: s.test_spec_id,
      title: s.title,
      status: "queued",
    })),
  );

  startRunner(run.id);
  revalidatePath("/runs");
  revalidatePath("/live");
  return { ok: true, runId: run.id };
}
