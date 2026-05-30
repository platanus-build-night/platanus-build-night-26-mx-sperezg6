import "server-only";

import {
  BedrockAgentCoreControlClient,
  CreateAgentRuntimeCommand,
  DeleteAgentRuntimeCommand,
  GetAgentRuntimeCommand,
} from "@aws-sdk/client-bedrock-agentcore-control";

function control() {
  return new BedrockAgentCoreControlClient({ region: process.env.AWS_REGION ?? "us-east-1" });
}

/** True when the env needed to provision per-agent runtimes is present. */
export function canProvisionRuntime() {
  return Boolean(
    process.env.AGENT_CODE_S3_BUCKET &&
      process.env.AGENT_CODE_S3_PREFIX &&
      process.env.AGENTCORE_EXEC_ROLE_ARN,
  );
}

/**
 * Create a NEW AgentCore Runtime for one agent, pointing at the shared S3 code
 * zip, with the agent's instructions + model + IDs baked in as env vars.
 * Returns { runtimeArn, runtimeId }.
 */
export async function createAgentRuntime(opts: {
  agentId: string;
  modelId: string;
  instructions: string;
}): Promise<{ runtimeArn: string; runtimeId: string }> {
  const env: Record<string, string> = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    AGENTCORE_BROWSER_ID: process.env.AGENTCORE_BROWSER_ID ?? "",
    AGENTCORE_MEMORY_ID: process.env.AGENTCORE_MEMORY_ID ?? "",
    AGENT_EXECUTOR: "strands",
    AWS_REGION: process.env.AWS_REGION ?? "us-east-1",
    BEDROCK_MODEL_ID: opts.modelId,
    AGENT_INSTRUCTIONS: opts.instructions || "",
  };

  // Runtime names must be <= ~48 chars, alnum + underscore.
  const name = `timeless_${opts.agentId.replace(/-/g, "").slice(0, 24)}`;

  const res = await control().send(
    new CreateAgentRuntimeCommand({
      agentRuntimeName: name,
      agentRuntimeArtifact: {
        codeConfiguration: {
          code: {
            s3: {
              bucket: process.env.AGENT_CODE_S3_BUCKET!,
              prefix: process.env.AGENT_CODE_S3_PREFIX!,
            },
          },
          runtime: "PYTHON_3_13",
          entryPoint: ["runtime_app.py"],
        },
      },
      roleArn: process.env.AGENTCORE_EXEC_ROLE_ARN!,
      networkConfiguration: { networkMode: "PUBLIC" },
      protocolConfiguration: { serverProtocol: "HTTP" },
      environmentVariables: env,
    }),
  );

  return { runtimeArn: res.agentRuntimeArn!, runtimeId: res.agentRuntimeId! };
}

/** Current status of a runtime (CREATING → READY, or *_FAILED). */
export async function getRuntimeStatus(runtimeId: string): Promise<string> {
  const res = await control().send(new GetAgentRuntimeCommand({ agentRuntimeId: runtimeId }));
  return res.status ?? "UNKNOWN";
}

export async function deleteAgentRuntime(runtimeId: string): Promise<void> {
  await control().send(new DeleteAgentRuntimeCommand({ agentRuntimeId: runtimeId }));
}
