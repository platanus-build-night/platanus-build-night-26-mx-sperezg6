import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getRuntimeStatus } from "@/lib/agentcore/provision";

export const dynamic = "force-dynamic";

/** Map an AgentCore runtime status to our coarse status. */
function mapStatus(aws: string): "provisioning" | "ready" | "failed" {
  const s = aws.toUpperCase();
  if (s === "READY") return "ready";
  if (s.includes("FAIL") || s === "DELETING") return "failed";
  return "provisioning";
}

/**
 * Re-check an agent's runtime status against AgentCore and sync it to the DB.
 * Called by the agent page poller and the manual "refresh" button.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sb = createServerSupabase();
  const { data: agent } = await sb
    .from("agents")
    .select("runtime_id, runtime_status")
    .eq("id", id)
    .maybeSingle();

  if (!agent) return NextResponse.json({ error: "not found" }, { status: 404 });

  const runtimeId = (agent as { runtime_id?: string }).runtime_id;
  if (!runtimeId) {
    return NextResponse.json({ status: agent.runtime_status ?? "none" });
  }

  let status = agent.runtime_status as string;
  try {
    status = mapStatus(await getRuntimeStatus(runtimeId));
    if (status !== agent.runtime_status) {
      await sb.from("agents").update({ runtime_status: status }).eq("id", id);
    }
  } catch {
    // AWS hiccup — keep the last known status.
  }
  return NextResponse.json({ status }, { headers: { "cache-control": "no-store" } });
}
