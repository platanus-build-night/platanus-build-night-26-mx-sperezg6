import "server-only";

import { createServerSupabase } from "@/lib/supabase/server";
import type {
  AgentRow,
  AppRow,
  ClientRow,
  FeatureRow,
  TestSpecRow,
} from "@/lib/supabase/types";

export type ClientWithCounts = ClientRow & {
  app_count: number;
  agent_count: number;
};
export type AppWithClient = AppRow & {
  client: Pick<ClientRow, "id" | "name"> | null;
  feature_count: number;
};
export type AgentWithRefs = AgentRow & {
  client: Pick<ClientRow, "id" | "name"> | null;
  default_feature: Pick<FeatureRow, "id" | "name"> | null;
};

function countOf(rel: unknown): number {
  if (Array.isArray(rel)) return rel[0]?.count ?? 0;
  return 0;
}

// ── Clients ──────────────────────────────────────────────────────────────────
export async function getClients(): Promise<ClientWithCounts[]> {
  const sb = createServerSupabase();
  const { data, error } = await sb
    .from("clients")
    .select("*, apps(count), agents(count)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((c) => ({
    ...(c as ClientRow),
    app_count: countOf((c as Record<string, unknown>).apps),
    agent_count: countOf((c as Record<string, unknown>).agents),
  }));
}

export async function getClient(id: string): Promise<ClientRow | null> {
  const sb = createServerSupabase();
  const { data } = await sb.from("clients").select("*").eq("id", id).maybeSingle();
  return (data as ClientRow) ?? null;
}

// ── Apps ──────────────────────────────────────────────────────────────────────
export async function getApps(clientId?: string): Promise<AppWithClient[]> {
  const sb = createServerSupabase();
  let q = sb
    .from("apps")
    .select("*, client:clients(id, name), features(count)")
    .order("created_at", { ascending: false });
  if (clientId) q = q.eq("client_id", clientId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((a) => ({
    ...(a as AppRow),
    client: (a as Record<string, unknown>).client as AppWithClient["client"],
    feature_count: countOf((a as Record<string, unknown>).features),
  }));
}

export async function getApp(id: string): Promise<AppWithClient | null> {
  const sb = createServerSupabase();
  const { data } = await sb
    .from("apps")
    .select("*, client:clients(id, name), features(count)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return {
    ...(data as AppRow),
    client: (data as Record<string, unknown>).client as AppWithClient["client"],
    feature_count: countOf((data as Record<string, unknown>).features),
  };
}

// ── Features ──────────────────────────────────────────────────────────────────
export async function getFeatures(appId: string): Promise<FeatureRow[]> {
  const sb = createServerSupabase();
  const { data, error } = await sb
    .from("features")
    .select("*")
    .eq("app_id", appId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as FeatureRow[];
}

/** Features with app + client labels, for selects in the agent form. */
export async function getFeatureOptions(): Promise<
  { id: string; name: string; appName: string; clientName: string }[]
> {
  const sb = createServerSupabase();
  const { data, error } = await sb
    .from("features")
    .select("id, name, app:apps(name, client:clients(name))")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((f) => {
    const rec = f as Record<string, unknown>;
    const app = rec.app as { name?: string; client?: { name?: string } } | null;
    return {
      id: rec.id as string,
      name: rec.name as string,
      appName: app?.name ?? "—",
      clientName: app?.client?.name ?? "—",
    };
  });
}

// ── Test specs ────────────────────────────────────────────────────────────────
export async function getTestSpecs(featureId: string): Promise<TestSpecRow[]> {
  const sb = createServerSupabase();
  const { data, error } = await sb
    .from("test_specs")
    .select("*")
    .eq("feature_id", featureId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TestSpecRow[];
}

// ── Agents ────────────────────────────────────────────────────────────────────
export async function getAgents(): Promise<AgentWithRefs[]> {
  const sb = createServerSupabase();
  const { data, error } = await sb
    .from("agents")
    .select("*, client:clients(id, name), default_feature:features(id, name)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((a) => ({
    ...(a as AgentRow),
    client: (a as Record<string, unknown>).client as AgentWithRefs["client"],
    default_feature: (a as Record<string, unknown>)
      .default_feature as AgentWithRefs["default_feature"],
  }));
}

export async function getAgent(id: string): Promise<AgentWithRefs | null> {
  const sb = createServerSupabase();
  const { data } = await sb
    .from("agents")
    .select("*, client:clients(id, name), default_feature:features(id, name)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return {
    ...(data as AgentRow),
    client: (data as Record<string, unknown>).client as AgentWithRefs["client"],
    default_feature: (data as Record<string, unknown>)
      .default_feature as AgentWithRefs["default_feature"],
  };
}

export async function getClientOptions(): Promise<Pick<ClientRow, "id" | "name">[]> {
  const sb = createServerSupabase();
  const { data } = await sb.from("clients").select("id, name").order("name");
  return (data ?? []) as Pick<ClientRow, "id" | "name">[];
}

export async function getAgentOptions(): Promise<{ id: string; name: string }[]> {
  const sb = createServerSupabase();
  const { data } = await sb.from("agents").select("id, name").order("name");
  return (data ?? []) as { id: string; name: string }[];
}
