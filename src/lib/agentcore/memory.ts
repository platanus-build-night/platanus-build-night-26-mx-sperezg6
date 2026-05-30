import "server-only";

import { BedrockAgentCoreClient, ListMemoryRecordsCommand } from "@aws-sdk/client-bedrock-agentcore";
import { createServerSupabase } from "@/lib/supabase/server";

export type MemoryItem = { kind: "fact" | "preference"; text: string };

/* eslint-disable @typescript-eslint/no-explicit-any */
function recordText(rec: any): string | null {
  const c = rec?.content;
  if (typeof c === "string") return c;
  if (c?.text) return c.text;
  if (Array.isArray(c)) return c.map((x: any) => x?.text).filter(Boolean).join(" ") || null;
  return rec?.memoryRecordSummary ?? null;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * What an agent "knows" — long-term records from AgentCore Memory across the
 * two actor namespaces: company-shared app facts (/company:{clientId}/facts)
 * and the agent's own preferences (/agent:{agentId}/preferences). Best-effort:
 * returns [] if memory isn't configured or extraction hasn't run yet.
 */
export async function getAgentMemory(
  agentId: string,
  clientId: string | null,
): Promise<MemoryItem[]> {
  const memoryId = process.env.AGENTCORE_MEMORY_ID;
  if (!memoryId) return [];

  const client = new BedrockAgentCoreClient({ region: process.env.AWS_REGION ?? "us-east-1" });
  const targets: { kind: MemoryItem["kind"]; namespace: string }[] = [];
  if (clientId) targets.push({ kind: "fact", namespace: `/company:${clientId}/facts` });
  targets.push({ kind: "preference", namespace: `/agent:${agentId}/preferences` });

  const out: MemoryItem[] = [];
  for (const t of targets) {
    try {
      const res = await client.send(
        new ListMemoryRecordsCommand({ memoryId, namespace: t.namespace, maxResults: 20 }),
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const records: any[] = (res as any).memoryRecordSummaries ?? (res as any).records ?? [];
      for (const r of records) {
        const text = recordText(r);
        if (text) out.push({ kind: t.kind, text });
      }
    } catch {
      // namespace empty / memory not ready — skip
    }
  }
  return out;
}

/** Convenience: resolve the agent's client_id then fetch its memory. */
export async function getAgentMemoryById(agentId: string): Promise<MemoryItem[]> {
  const sb = createServerSupabase();
  const { data } = await sb.from("agents").select("client_id").eq("id", agentId).maybeSingle();
  return getAgentMemory(agentId, (data as { client_id?: string } | null)?.client_id ?? null);
}
