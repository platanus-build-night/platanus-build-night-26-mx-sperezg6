#!/usr/bin/env python3
"""
Provision AgentCore resources for Timeless: a Browser (with session recording)
and a Memory store (3 long-term strategies). Prints the IDs to paste into .env.

Reads AWS creds + region from the project .env. Idempotent-ish: reuses an
existing browser/memory whose name matches if one is found.

Usage:
    python scripts/provision_agentcore.py --exec-role arn:aws:iam::ACCT:role/AgentCoreExecRole
    # --exec-role optional; the Browser works with networkMode PUBLIC and no role.
"""

import argparse
import os
import sys

import boto3

BROWSER_NAME = "timeless_qa_browser"
MEMORY_NAME = "timeless_qa_memory"


def load_env(path=".env"):
    if not os.path.exists(path):
        return
    for line in open(path):
        line = line.strip()
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())


def ensure_browser(cp, exec_role: str | None) -> str:
    existing = cp.list_browsers().get("browserSummaries", [])
    for b in existing:
        if b.get("name") == BROWSER_NAME:
            print(f"↩  Reusing browser {b['browserId']}")
            return b["browserId"]

    kwargs = {
        "name": BROWSER_NAME,
        "description": "Timeless QA cloud browser",
        "networkConfiguration": {"networkMode": "PUBLIC"},
    }
    if exec_role:
        kwargs["executionRoleArn"] = exec_role
        # Recording requires an execution role + S3 access.
        bucket = os.environ.get("AGENTCORE_RECORDING_BUCKET")
        if bucket:
            kwargs["recording"] = {
                "enabled": True,
                "s3Location": {"bucket": bucket, "prefix": "timeless/recordings/"},
            }
    r = cp.create_browser(**kwargs)
    bid = r["browserId"]
    print(f"✅ Created browser {bid}")
    return bid


def ensure_memory(cp) -> str:
    existing = cp.list_memories().get("memories", cp.list_memories().get("memorySummaries", []))
    for mrec in existing:
        if mrec.get("name") == MEMORY_NAME:
            mid = mrec.get("memoryId") or mrec.get("id")
            print(f"↩  Reusing memory {mid}")
            return mid

    strategies = [
        {
            "semanticMemoryStrategy": {
                "name": "app_facts",
                "description": "Reusable facts about each app (layout, login, flaky areas)",
                "namespaceTemplates": ["/{actorId}/facts"],
            }
        },
        {
            "summaryMemoryStrategy": {
                "name": "run_summaries",
                "description": "Per-run summaries of what was tested and found",
                "namespaceTemplates": ["/{actorId}/{sessionId}/summary"],
            }
        },
        {
            "userPreferenceMemoryStrategy": {
                "name": "agent_prefs",
                "description": "Per-agent testing preferences and conventions",
                "namespaceTemplates": ["/{actorId}/preferences"],
            }
        },
    ]
    r = cp.create_memory(
        name=MEMORY_NAME,
        description="Timeless QA agent memory",
        eventExpiryDuration=90,
        memoryStrategies=strategies,
    )
    mem = r.get("memory", r)
    mid = mem.get("memoryId") or mem.get("id")
    print(f"✅ Created memory {mid}")
    return mid


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--exec-role", default=os.environ.get("AGENTCORE_EXEC_ROLE_ARN"),
                    help="AgentCore execution role ARN (optional for PUBLIC browser w/o recording)")
    args = ap.parse_args()

    load_env()
    region = os.environ.get("AWS_REGION", "us-east-1")
    sess = boto3.Session(region_name=region)
    ident = sess.client("sts").get_caller_identity()
    print(f"Account {ident['Account']} · region {region} · {ident['Arn']}\n")

    cp = sess.client("bedrock-agentcore-control")
    browser_id = ensure_browser(cp, args.exec_role)
    memory_id = ensure_memory(cp)

    print("\n" + "=" * 60)
    print("Paste these into .env:")
    print(f"AGENTCORE_BROWSER_ID={browser_id}")
    print(f"AGENTCORE_MEMORY_ID={memory_id}")
    print("=" * 60)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n❌ {type(e).__name__}: {e}", file=sys.stderr)
        sys.exit(1)
