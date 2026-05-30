"""
AgentCore Runtime entrypoint for the Timeless QA agent.

Deployed to AgentCore Runtime; invoked by the Next.js backend via
invoke_agent_runtime with payload {"run_id": "<uuid>"}. Wraps qa_agent.run(),
which drives an AgentCore Browser session with a Strands agent and streams
run_steps / screenshots / recording to Supabase.

Local dev: `python runtime_app.py` starts the same HTTP server the Runtime uses.
"""

from bedrock_agentcore.runtime import BedrockAgentCoreApp

from qa_agent import run

app = BedrockAgentCoreApp()


@app.entrypoint
def handle_request(payload, context=None):
    run_id = (payload or {}).get("run_id")
    if not run_id:
        return {"error": "missing run_id"}
    return run({"run_id": run_id})


if __name__ == "__main__":
    app.run()
