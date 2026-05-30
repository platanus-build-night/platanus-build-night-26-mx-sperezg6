import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const STEP_MS = 750;

type SpecRow = { id: string; test_spec_id: string | null; title: string };
type Outcome = "passed" | "failed" | "error" | "cancelled";

/** True once the run has left an active state — e.g. stopped by the user. */
async function isRunStopped(sb: SupabaseClient, runId: string): Promise<boolean> {
  const { data } = await sb.from("runs").select("status").eq("id", runId).maybeSingle();
  const status = (data as { status?: string } | null)?.status;
  return status != null && status !== "queued" && status !== "running";
}

/**
 * Mock run executor — simulates an AgentCore run by streaming run_spec + run_step
 * status changes into Postgres over time. The UI (polling/Realtime) reflects it
 * live. Swap with the real AgentCore runner in M4 behind the same entrypoint.
 * Fire-and-forget: called without await from the run server actions.
 */
export async function runMock(runId: string) {
  const sb = createServerSupabase();
  try {
    await sb
      .from("runs")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("id", runId);

    const { data: specs } = await sb
      .from("run_specs")
      .select("id, test_spec_id, title")
      .eq("run_id", runId);

    if (!specs || specs.length === 0) {
      await sb
        .from("runs")
        .update({ status: "error", ended_at: new Date().toISOString(), summary: "Sin casos de prueba" })
        .eq("id", runId);
      return;
    }

    // Specs run concurrently — mirrors AgentCore's parallel isolated sessions.
    const results = await Promise.all(specs.map((s) => simulateSpec(sb, runId, s as SpecRow)));

    // If the user stopped the run mid-flight, leave the cancelled status as-is.
    if (await isRunStopped(sb, runId)) return;

    const agg: Outcome = results.includes("error")
      ? "error"
      : results.includes("failed")
        ? "failed"
        : "passed";
    const passed = results.filter((r) => r === "passed").length;

    await sb
      .from("runs")
      .update({
        status: agg,
        ended_at: new Date().toISOString(),
        summary: `${passed}/${results.length} casos aprobados`,
      })
      .eq("id", runId);
  } catch (err) {
    await sb
      .from("runs")
      .update({ status: "error", ended_at: new Date().toISOString(), summary: String(err) })
      .eq("id", runId);
  }
}

async function simulateSpec(sb: SupabaseClient, runId: string, spec: SpecRow): Promise<Outcome> {
  // Load NL steps from the test spec (fallback to a generic flow).
  let steps: { description: string }[] = [];
  if (spec.test_spec_id) {
    const { data: ts } = await sb
      .from("test_specs")
      .select("steps_json")
      .eq("id", spec.test_spec_id)
      .maybeSingle();
    steps = ((ts?.steps_json as { description: string }[] | null) ?? []).filter((s) => s?.description);
  }
  if (steps.length === 0) {
    steps = [
      { description: "Abrir la aplicación" },
      { description: "Ejecutar la funcionalidad" },
      { description: "Verificar el resultado esperado" },
    ];
  }

  await sb
    .from("run_specs")
    .update({
      status: "running",
      started_at: new Date().toISOString(),
      browser_session_id: `mock-${spec.id.slice(0, 8)}`,
      live_view_url: `mock://session/${spec.id}`,
    })
    .eq("id", spec.id);

  const rows = steps.map((st, i) => ({
    run_spec_id: spec.id,
    idx: i,
    description: st.description,
    status: "pending" as const,
  }));
  const { data: inserted } = await sb.from("run_steps").insert(rows).select("id, idx");
  const ids = (inserted ?? [])
    .sort((a, b) => (a.idx as number) - (b.idx as number))
    .map((r) => r.id as string);

  // ~18% of specs surface a bug at a random step (keeps the demo varied but mostly green).
  const failAt = Math.random() < 0.18 ? Math.floor(Math.random() * ids.length) : -1;

  for (let i = 0; i < ids.length; i++) {
    // Cooperative cancellation: bail out if the user stopped the run.
    if (await isRunStopped(sb, runId)) return "cancelled";

    await sb
      .from("run_steps")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("id", ids[i]);
    await sleep(STEP_MS + Math.random() * 400);

    if (await isRunStopped(sb, runId)) return "cancelled";

    if (i === failAt) {
      await sb
        .from("run_steps")
        .update({
          status: "failed",
          ended_at: new Date().toISOString(),
          log: "Aserción fallida: el resultado no coincide con lo esperado.",
        })
        .eq("id", ids[i]);
      await sb
        .from("run_specs")
        .update({
          status: "failed",
          ended_at: new Date().toISOString(),
          summary: `Falló en el paso ${i + 1}: ${steps[i].description}`,
        })
        .eq("id", spec.id);
      return "failed";
    }

    await sb
      .from("run_steps")
      .update({ status: "passed", ended_at: new Date().toISOString() })
      .eq("id", ids[i]);
  }

  await sb
    .from("run_specs")
    .update({ status: "passed", ended_at: new Date().toISOString(), summary: "Todos los pasos aprobados" })
    .eq("id", spec.id);
  return "passed";
}
