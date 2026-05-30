import "server-only";

import { after } from "next/server";
import { runMock } from "./mock";
import { runReal } from "./real";

/**
 * Kicks off execution for a run. Uses Next's `after()` so the work runs AFTER
 * the server action's response is sent — on Vercel, un-awaited promises are
 * killed when the function freezes, so fire-and-forget would leave runs stuck.
 * `after()` keeps the function alive for the callback within its max duration.
 *
 * - mock: streams simulated status into Postgres over a few seconds.
 * - real: invokes the agent's AgentCore Runtime (which is durable on its own —
 *   even if `after()` is cut short, the runtime keeps going and streams to
 *   Supabase; awaiting just guarantees the invoke is actually sent).
 *
 * Controlled by APP_MODE (mock | real).
 */
export function startRunner(runId: string) {
  const mode = process.env.APP_MODE ?? "mock";
  after(async () => {
    try {
      if (mode === "real") await runReal(runId);
      else await runMock(runId);
    } catch (e) {
      console.error(`[runner] ${mode} run ${runId} failed:`, e);
    }
  });
}
