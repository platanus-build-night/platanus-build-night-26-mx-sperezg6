import "server-only";

import { randomUUID } from "node:crypto";
import {
  BedrockAgentCoreClient,
  InvokeAgentRuntimeCommand,
} from "@aws-sdk/client-bedrock-agentcore";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * Real runner — invokes the agent's OWN AgentCore Runtime (provisioned per agent
 * with its instructions + model baked in). Looks up the runtime ARN from the
 * run's agent. Fire-and-forget: the runtime drives a real browser session with a
 * Strands agent and streams run_steps / screenshots / recording to Supabase.
 */
export async function runReal(runId: string) {
  const sb = createServerSupabase();
  const { data: run } = await sb
    .from("runs")
    .select("agent:agents(runtime_arn, runtime_status)")
    .eq("id", runId)
    .maybeSingle();

  const agent = (run as { agent?: { runtime_arn?: string; runtime_status?: string } } | null)?.agent;
  const arn = agent?.runtime_arn ?? process.env.AGENT_RUNTIME_ARN;

  if (!arn) {
    await sb
      .from("runs")
      .update({ status: "error", summary: "El agente no tiene un runtime aprovisionado" })
      .eq("id", runId);
    return;
  }

  const client = new BedrockAgentCoreClient({ region: process.env.AWS_REGION ?? "us-east-1" });
  const sessionId = `run-${runId}-${randomUUID()}`.padEnd(33, "0");

  const cmd = new InvokeAgentRuntimeCommand({
    agentRuntimeArn: arn,
    qualifier: "DEFAULT",
    runtimeSessionId: sessionId,
    contentType: "application/json",
    payload: new TextEncoder().encode(JSON.stringify({ run_id: runId })),
  });

  // Awaited inside the caller's after() so the invoke is guaranteed to be sent.
  // The AgentCore Runtime is durable: it keeps executing and streaming to
  // Supabase even if this awaiting function is cut short by the platform.
  try {
    await client.send(cmd);
  } catch (err) {
    console.error(`[runner:real] InvokeAgentRuntime failed for run ${runId}:`, err);
    await sb
      .from("runs")
      .update({ status: "error", summary: "No se pudo invocar el runtime del agente" })
      .eq("id", runId);
  }
}
