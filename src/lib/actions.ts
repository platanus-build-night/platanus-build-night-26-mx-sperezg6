"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  canProvisionRuntime,
  createAgentRuntime,
  deleteAgentRuntime,
} from "@/lib/agentcore/provision";

export type ActionState = { ok: boolean; error?: string };
const ok: ActionState = { ok: true };
const fail = (error: string): ActionState => ({ ok: false, error });

function str(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

// ── Clients ──────────────────────────────────────────────────────────────────
const clientSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  website: z.string().optional(),
  contact: z.string().optional(),
  logo_url: z.string().optional(),
});

export async function createClientAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const parsed = clientSchema.safeParse({
    name: str(fd, "name"),
    website: str(fd, "website"),
    contact: str(fd, "contact"),
    logo_url: str(fd, "logo_url"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const sb = createServerSupabase();
  const { error } = await sb.from("clients").insert({
    name: parsed.data.name,
    website: parsed.data.website || null,
    contact: parsed.data.contact || null,
    logo_url: parsed.data.logo_url || null,
  });
  if (error) return fail(error.message);
  revalidatePath("/clients");
  return ok;
}

export async function deleteClientAction(id: string): Promise<void> {
  const sb = createServerSupabase();
  await sb.from("clients").delete().eq("id", id);
  revalidatePath("/clients");
}

// ── Apps ──────────────────────────────────────────────────────────────────────
const appSchema = z.object({
  client_id: z.string().uuid("Selecciona un cliente"),
  name: z.string().min(1, "El nombre es obligatorio"),
  base_url: z.string().url("Debe ser una URL válida (https://…)"),
  login_required: z.boolean(),
  image_url: z.string().optional(),
});

export async function createAppAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const parsed = appSchema.safeParse({
    client_id: str(fd, "client_id"),
    name: str(fd, "name"),
    base_url: str(fd, "base_url"),
    login_required: fd.get("login_required") === "on",
    image_url: str(fd, "image_url"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const { image_url, ...appData } = parsed.data;
  const sb = createServerSupabase();
  // Only send image_url when set, so inserts still work before migration 0002.
  const payload: typeof appData & { image_url?: string } = { ...appData };
  if (image_url) payload.image_url = image_url;
  const { error } = await sb.from("apps").insert(payload);
  if (error) return fail(error.message);
  revalidatePath("/apps");
  revalidatePath(`/clients/${parsed.data.client_id}`);
  return ok;
}

export async function deleteAppAction(id: string): Promise<void> {
  const sb = createServerSupabase();
  await sb.from("apps").delete().eq("id", id);
  revalidatePath("/apps");
}

// ── Features ──────────────────────────────────────────────────────────────────
const featureSchema = z.object({
  app_id: z.string().uuid(),
  name: z.string().min(1, "El nombre es obligatorio"),
  description: z.string().optional(),
});

export async function createFeatureAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const parsed = featureSchema.safeParse({
    app_id: str(fd, "app_id"),
    name: str(fd, "name"),
    description: str(fd, "description"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const sb = createServerSupabase();
  const { error } = await sb.from("features").insert({
    app_id: parsed.data.app_id,
    name: parsed.data.name,
    description: parsed.data.description || null,
  });
  if (error) return fail(error.message);
  revalidatePath(`/apps/${parsed.data.app_id}`);
  return ok;
}

/**
 * Deletes a feature and all of its test specs. Also clears the
 * `default_feature_id` of any agent that targeted it so no dangling reference
 * remains (the agent stays, it just loses its target). Children are removed
 * explicitly so this works regardless of DB cascade configuration.
 */
export async function deleteFeatureAction(featureId: string, appId?: string): Promise<void> {
  const sb = createServerSupabase();
  await sb.from("agents").update({ default_feature_id: null }).eq("default_feature_id", featureId);
  await sb.from("test_specs").delete().eq("feature_id", featureId);
  await sb.from("features").delete().eq("id", featureId);
  if (appId) revalidatePath(`/apps/${appId}`);
  revalidatePath("/apps");
}

// ── Test specs (NL steps, one per line) ───────────────────────────────────────
const testSpecSchema = z.object({
  feature_id: z.string().uuid(),
  title: z.string().min(1, "El título es obligatorio"),
  steps: z.string().min(1, "Agrega al menos un paso"),
});

export async function createTestSpecAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const parsed = testSpecSchema.safeParse({
    feature_id: str(fd, "feature_id"),
    title: str(fd, "title"),
    steps: str(fd, "steps"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const steps_json = parsed.data.steps
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((description) => ({ description }));
  if (steps_json.length === 0) return fail("Agrega al menos un paso");

  const sb = createServerSupabase();
  const { error } = await sb.from("test_specs").insert({
    feature_id: parsed.data.feature_id,
    title: parsed.data.title,
    steps_json,
    expected_json: [],
    source: "user",
  });
  if (error) return fail(error.message);
  revalidatePath(`/apps`);
  return ok;
}

const updateTestSpecSchema = z.object({
  id: z.string().uuid(),
  app_id: z.string().optional(),
  title: z.string().min(1, "El título es obligatorio"),
  steps: z.string().min(1, "Agrega al menos un paso"),
});

/**
 * Updates a test spec's title and steps. Lets you refine the natural-language
 * steps when the agent isn't following them correctly, then re-run.
 */
export async function updateTestSpecAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const parsed = updateTestSpecSchema.safeParse({
    id: str(fd, "id"),
    app_id: str(fd, "app_id"),
    title: str(fd, "title"),
    steps: str(fd, "steps"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const steps_json = parsed.data.steps
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((description) => ({ description }));
  if (steps_json.length === 0) return fail("Agrega al menos un paso");

  const sb = createServerSupabase();
  const { error } = await sb
    .from("test_specs")
    .update({ title: parsed.data.title, steps_json })
    .eq("id", parsed.data.id);
  if (error) return fail(error.message);
  if (parsed.data.app_id) revalidatePath(`/apps/${parsed.data.app_id}`);
  revalidatePath("/apps");
  return ok;
}

/** Deletes a single test spec. `appId` lets us revalidate the app detail page. */
export async function deleteTestSpecAction(specId: string, appId?: string): Promise<void> {
  const sb = createServerSupabase();
  await sb.from("test_specs").delete().eq("id", specId);
  if (appId) revalidatePath(`/apps/${appId}`);
  revalidatePath("/apps");
}

// ── Agents ────────────────────────────────────────────────────────────────────
const agentSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  model_id: z.string().min(1),
  client_id: z.string().optional(),
  default_feature_id: z.string().optional(),
  instructions: z.string().optional(),
  image_url: z.string().optional(),
});

export async function createAgentAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const parsed = agentSchema.safeParse({
    name: str(fd, "name"),
    model_id: str(fd, "model_id"),
    client_id: str(fd, "client_id"),
    default_feature_id: str(fd, "default_feature_id"),
    instructions: str(fd, "instructions"),
    image_url: str(fd, "image_url"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const sb = createServerSupabase();
  // Only send image_url when set, so inserts still work before migration 0002.
  const payload: {
    name: string;
    model_id: string;
    client_id: string | null;
    default_feature_id: string | null;
    instructions: string | null;
    image_url?: string;
  } = {
    name: parsed.data.name,
    model_id: parsed.data.model_id,
    client_id: parsed.data.client_id || null,
    default_feature_id: parsed.data.default_feature_id || null,
    instructions: parsed.data.instructions || null,
  };
  if (parsed.data.image_url) payload.image_url = parsed.data.image_url;
  const { data: inserted, error } = await sb.from("agents").insert(payload).select("id").single();
  if (error) return fail(error.message);

  // Provision a dedicated AgentCore Runtime for this agent (instructions + model
  // baked in as env vars on the shared S3 code zip). Best-effort: the agent is
  // still created if provisioning is unavailable; it just can't run until ready.
  if (inserted?.id && canProvisionRuntime()) {
    try {
      const { runtimeArn, runtimeId } = await createAgentRuntime({
        agentId: inserted.id,
        modelId: parsed.data.model_id,
        instructions: parsed.data.instructions || "",
      });
      await sb
        .from("agents")
        .update({ runtime_arn: runtimeArn, runtime_id: runtimeId, runtime_status: "provisioning" })
        .eq("id", inserted.id);
    } catch (e) {
      await sb.from("agents").update({ runtime_status: "failed" }).eq("id", inserted.id);
      console.error("[agent] runtime provisioning failed:", e);
    }
  }

  revalidatePath("/agents");
  return ok;
}

export async function deleteAgentAction(id: string): Promise<void> {
  const sb = createServerSupabase();
  // Tear down the agent's dedicated runtime first (best-effort).
  const { data: agent } = await sb.from("agents").select("runtime_id").eq("id", id).maybeSingle();
  const runtimeId = (agent as { runtime_id?: string } | null)?.runtime_id;
  if (runtimeId) {
    try {
      await deleteAgentRuntime(runtimeId);
    } catch (e) {
      console.error("[agent] runtime deletion failed:", e);
    }
  }
  await sb.from("agents").delete().eq("id", id);
  revalidatePath("/agents");
}
