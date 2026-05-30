#!/usr/bin/env python3
"""
Build the SHARED agent code+deps artifact ONCE and upload it to S3.

AgentCore code-deploy is Lambda-style: deps must be vendored in the zip
(cross-compiled for Linux ARM64). We use the starter toolkit to build deps +
zip + upload. Per-agent runtimes are then created (by the Next backend) pointing
at this same S3 zip with per-agent environmentVariables.

Run from agent-service/:  python build_artifact.py
Prints AGENT_CODE_S3_BUCKET / AGENT_CODE_S3_PREFIX to put in .env.
"""

import os
import sys

from bedrock_agentcore_starter_toolkit import Runtime


def load_env(path):
    if not os.path.exists(path):
        return
    for line in open(path):
        line = line.strip()
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())


def main():
    load_env(os.path.join("..", ".env"))
    region = os.environ.get("AWS_REGION", "us-east-1")
    role = os.environ["AGENTCORE_EXEC_ROLE_ARN"]

    rt = Runtime()
    print("Configuring (direct code deploy, PYTHON_3_13)…")
    rt.configure(
        entrypoint="runtime_app.py",
        requirements_file="requirements.txt",
        region=region,
        agent_name="timeless_qa_base",
        execution_role=role,
        deployment_type="direct_code_deploy",
        runtime_type="PYTHON_3_13",
        auto_create_s3=True,
    )
    print("Launching (builds ARM64 deps → zip → S3 → base runtime)…")
    result = rt.launch()
    print("\nLaunchResult attrs:", {k: getattr(result, k) for k in dir(result)
                                    if not k.startswith("_") and not callable(getattr(result, k))})


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"\n❌ {type(e).__name__}: {e}", file=sys.stderr)
        sys.exit(1)
