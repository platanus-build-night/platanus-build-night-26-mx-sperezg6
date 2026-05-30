/** Bedrock models offered for the Strands agent's reasoning (per-agent selection). */
export const AGENT_MODELS: { id: string; label: string; hint: string }[] = [
  { id: "global.anthropic.claude-opus-4-8", label: "Claude Opus 4.8", hint: "Máxima capacidad" },
  { id: "global.anthropic.claude-opus-4-7", label: "Claude Opus 4.7", hint: "Alta capacidad" },
  { id: "global.anthropic.claude-sonnet-4-6", label: "Claude Sonnet 4.6", hint: "Equilibrado" },
  { id: "global.anthropic.claude-haiku-4-5-20251001-v1:0", label: "Claude Haiku 4.5", hint: "Rápido y económico (recomendado)" },
  { id: "us.amazon.nova-pro-v1:0", label: "Amazon Nova Pro", hint: "Nativo AWS" },
  { id: "us.deepseek.r1-v1:0", label: "DeepSeek R1", hint: "Razonamiento abierto" },
];

export const DEFAULT_MODEL_ID = "global.anthropic.claude-haiku-4-5-20251001-v1:0";

export function modelLabel(id: string) {
  return AGENT_MODELS.find((m) => m.id === id)?.label ?? id;
}

export type Provider = "Anthropic" | "Amazon" | "DeepSeek";

/** Derive the provider from the Bedrock model id. */
export function providerFor(id: string): Provider {
  if (id.includes(".amazon.")) return "Amazon";
  if (id.includes(".deepseek.")) return "DeepSeek";
  return "Anthropic";
}
