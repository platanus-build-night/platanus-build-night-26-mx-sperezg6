"""
Timeless QA agent — real AgentCore execution for one run.

Flow per run:
  1. Hydrate context from AgentCore Memory (company-shared + agent-private actors).
  2. For each spec: start an AgentCore Browser session, connect Playwright over the
     automationStream (CDP), execute the NL steps, capture a screenshot per step,
     and stream run_step / run_spec status into Supabase.
  3. Persist observations back to Memory; stop the session.

Designed to run either locally (python qa_agent.py --run-id ...) or inside
AgentCore Runtime (entrypoint wraps `run(payload)`).
"""

from __future__ import annotations

import os
import json
import traceback
from datetime import datetime, timezone

import boto3
from bedrock_agentcore.tools.browser_client import BrowserClient
from supabase import create_client

from pw_driver import PWDriver


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _sb():
    url = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)


# ── Memory helpers ──────────────────────────────────────────────────────────────
def memory_hydrate(dp, memory_id: str, actor_id: str, query: str, top_k: int = 5) -> list[str]:
    if not memory_id:
        return []
    try:
        r = dp.retrieve_memory_records(
            memoryId=memory_id,
            namespace=f"/{actor_id}/facts",
            searchCriteria={"searchQuery": query, "topK": top_k},
        )
        out = []
        for rec in r.get("memoryRecordSummaries", r.get("records", [])):
            content = rec.get("content", {})
            text = content.get("text") if isinstance(content, dict) else str(content)
            if text:
                out.append(text)
        return out
    except Exception as e:  # memory is best-effort, never fail the run
        print(f"[memory] hydrate skipped: {e}")
        return []


def memory_record(dp, memory_id: str, actor_id: str, session_id: str, text: str):
    if not memory_id:
        return
    try:
        dp.create_event(
            memoryId=memory_id,
            actorId=actor_id,
            sessionId=session_id,
            eventTimestamp=datetime.now(timezone.utc),
            payload=[{"conversational": {"content": {"text": text}, "role": "ASSISTANT"}}],
        )
    except Exception as e:
        print(f"[memory] record skipped: {e}")


# ── Spec execution ──────────────────────────────────────────────────────────────
def run_spec(sb, dp, region, browser_id, memory_id, run_spec, company_actor, session_id, model_id):
    spec_id = run_spec["id"]
    steps = []
    if run_spec.get("test_spec_id"):
        ts = sb.table("test_specs").select("steps_json").eq("id", run_spec["test_spec_id"]).maybe_single().execute()
        if ts.data:
            steps = [s for s in (ts.data.get("steps_json") or []) if s.get("description")]
    if not steps:
        steps = [{"description": "Abrir la aplicación"}, {"description": "Verificar el resultado"}]

    bc = BrowserClient(region=region)
    bc.start(identifier=browser_id or "aws.browser.v1",
             name=f"timeless-{spec_id[:8]}",
             session_timeout_seconds=1800,
             viewport={"width": 1280, "height": 800})
    live_url = ""
    try:
        live_url = bc.generate_live_view_url(expires=300)
    except Exception as e:
        print(f"[live] url skipped: {e}")

    sb.table("run_specs").update({
        "status": "running",
        "started_at": _now(),
        "browser_session_id": bc.session_id,
        "live_view_url": live_url,
    }).eq("id", spec_id).execute()

    # Insert step rows up front (pending) so the UI shows the plan immediately.
    rows = [{"run_spec_id": spec_id, "idx": i, "description": s["description"], "status": "pending"}
            for i, s in enumerate(steps)]
    inserted = sb.table("run_steps").insert(rows).execute().data
    step_ids = [r["id"] for r in sorted(inserted, key=lambda r: r["idx"])]

    outcome = "passed"
    executed: list[dict] = []  # what the agent actually did, for the report
    ws_url, ws_headers = bc.generate_ws_headers()
    # All Playwright ops run on the driver's single dedicated thread (sync API is
    # thread-bound; Strands runs tools on worker threads → greenlet errors otherwise).
    drv = PWDriver()
    drv.start(ws_url, ws_headers)
    try:
        for i, step in enumerate(steps):
            print(f"\n[step {i}/{len(steps)-1}] {step['description']!r}  url={drv.url}", flush=True)
            sb.table("run_steps").update({"status": "running", "started_at": _now()}).eq("id", step_ids[i]).execute()
            ok, log = run_one_step(drv, step["description"], model_id, region)
            shot = _screenshot(drv, sb, spec_id, i)
            print(f"[step {i}] {'PASS' if ok else 'FAIL'}  url={drv.url}\n{log}", flush=True)
            executed.append({"description": step["description"], "status": "passed" if ok else "failed", "log": log})
            # Store the full trace on EVERY step (pass or fail) so the UI/DB shows
            # exactly what the agent did — not just failures.
            sb.table("run_steps").update({
                "status": "passed" if ok else "failed",
                "ended_at": _now(), "screenshot_url": shot, "log": log,
            }).eq("id", step_ids[i]).execute()
            if not ok:
                outcome = "failed"
                break
    finally:
        drv.stop()

    summary = "Todos los pasos aprobados" if outcome == "passed" else f"Terminó con estado {outcome}"
    sb.table("run_specs").update({
        "status": outcome, "ended_at": _now(), "summary": summary,
    }).eq("id", spec_id).execute()

    # Detailed QA report (dev + product) — separate best-effort write so a missing
    # `report` column (migration 0006 not yet applied) can't break the run.
    report = generate_report(region, model_id, run_spec.get("title", "Caso de prueba"), executed, outcome)
    if report:
        try:
            sb.table("run_specs").update({"report": report}).eq("id", spec_id).execute()
        except Exception as e:
            print(f"[report] store skipped: {e}")

    memory_record(dp, memory_id, company_actor, session_id,
                  f"Probé '{run_spec.get('title')}': resultado {outcome}.")

    # Capture the session replay artifact (S3 key) for "Ver repetición".
    replay = None
    try:
        info = dp.get_browser_session(browserIdentifier=browser_id or "aws.browser.v1",
                                      sessionId=bc.session_id)
        replay = info.get("sessionReplayArtifact")
    except Exception as e:
        print(f"[replay] fetch skipped: {e}")
    if replay:
        sb.table("run_specs").update({"replay_s3_key": replay}).eq("id", spec_id).execute()

    try:
        bc.stop()
    except Exception:
        pass
    return outcome


import re


# Simple, short prompt — less load on the model (helps with throttling) while
# still producing a useful dev+product summary.
REPORT_PROMPT = """Genera un informe breve de QA en español y Markdown a partir de estos datos. \
No inventes nada. Caso: {title}. Resultado: {outcome}.
Pasos:
{steps}

Responde con:
## Resumen
1-2 frases: qué se probó y el resultado.
## Detalle
Viñetas de lo que pasó en cada paso (y dónde falló, si aplica)."""


def generate_report(region: str, model_id: str, title: str, executed: list[dict], outcome: str) -> str | None:
    """Ask the model for a short dev+product QA report. Best-effort, but loud on error."""
    if not executed:
        print("[report] no executed steps, skipping", flush=True)
        return None
    steps_txt = "\n".join(
        f"{i + 1}. [{s['status']}] {s['description']}" + (f" — {s['log']}" if s.get("log") else "")
        for i, s in enumerate(executed)
    )
    prompt = REPORT_PROMPT.format(title=title, outcome=outcome, steps=steps_txt)

    # Prefer the Anthropic Claude API directly when a key is set (own quota,
    # avoids Bedrock's per-day token cap). Fall back to Bedrock otherwise.
    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if api_key:
        try:
            import anthropic
            anth_id = "claude-haiku-4-5"
            for k in ("claude-sonnet-4-6", "claude-sonnet-4-5", "claude-opus-4-7", "claude-haiku-4-5"):
                if k in (model_id or ""):
                    anth_id = k
                    break
            client = anthropic.Anthropic(api_key=api_key)
            resp = client.messages.create(
                model=anth_id, max_tokens=600,
                messages=[{"role": "user", "content": prompt}],
            )
            report = "".join(b.text for b in resp.content if getattr(b, "type", "") == "text").strip()
            print(f"[report] generated via Anthropic API ({len(report)} chars)", flush=True)
            return report
        except Exception as e:
            print(f"[report] Anthropic API failed ({type(e).__name__}): {e}", flush=True)
            return None

    # Adaptive retries so transient ThrottlingException doesn't lose the report.
    from botocore.config import Config
    rt = boto3.client("bedrock-runtime", region_name=region,
                      config=Config(retries={"max_attempts": 4, "mode": "adaptive"}))
    try:
        resp = rt.converse(
            modelId=model_id,
            messages=[{"role": "user", "content": [{"text": prompt}]}],
            inferenceConfig={"maxTokens": 600, "temperature": 0.2},
        )
        report = resp["output"]["message"]["content"][0]["text"].strip()
        print(f"[report] generated via Bedrock ({len(report)} chars)", flush=True)
        return report
    except Exception as e:
        # Loud, typed error so we can actually see WHY (AccessDenied, Throttling…).
        print(f"[report] Bedrock FAILED ({type(e).__name__}): {e}", flush=True)
        return None


def run_one_step(drv, instruction: str, model_id: str, region: str) -> tuple[bool, str | None]:
    """
    Execute one NL step. Uses the Strands agent (selected model drives the browser
    via tools) unless AGENT_EXECUTOR=heuristic; falls back to the deterministic
    executor on any error. `drv` is a PWDriver; all page ops go through drv.call.
    Returns (ok, log).
    """
    mode = os.environ.get("AGENT_EXECUTOR", "strands")
    if mode != "heuristic":
        try:
            from strands_executor import execute_step as strands_execute
            # Instructions are baked into this agent's runtime via env (per-agent runtime).
            extra = os.environ.get("AGENT_INSTRUCTIONS", "")
            return strands_execute(drv.call, instruction, model_id, region, extra)
        except Exception as e:
            print(f"[strands] fell back to heuristic: {type(e).__name__}: {e}", flush=True)
    # Deterministic fallback (runs on the driver thread).
    try:
        drv.call(lambda page: _execute_step(page, instruction))
        return True, "heurístico: OK"
    except AssertionError as ae:
        return False, f"heurístico: {ae}"
    except Exception as e:
        return False, f"heurístico: {type(e).__name__}: {e}"


def _quoted(text: str):
    m = re.search(r'["“‘\']([^"”’\']+)["”’\']', text)
    return m.group(1) if m else None


def _execute_step(page, instruction: str):
    """
    Deterministic NL-step executor good enough for real form/login flows.
    Recognises: navigate, type-into-field, click, and assert-text. (LLM-driven
    execution via Strands + the selected Bedrock model is the next upgrade.)
    Raises AssertionError on a failed verification (→ a QA finding).
    """
    low = instruction.lower()
    val = _quoted(instruction)

    # ── Navigate ────────────────────────────────────────────────────────────
    if "http" in low and any(w in low for w in ("ir a", "abrir", "navega", "go to", "open", "visit")):
        url = "http" + instruction.split("http", 1)[1].strip().strip('"”’\'')
        page.goto(url, wait_until="domcontentloaded", timeout=30000)
        return

    # ── Type into a field ───────────────────────────────────────────────────
    if any(w in low for w in ("escrib", "ingres", "introduc", "type", "enter", "rellena", "completa")):
        value = val or instruction.split()[-1]
        target = _resolve_input(page, low)
        if target is None:
            raise AssertionError(f"No encontré el campo para: {instruction}")
        target.fill(value)
        return

    # ── Click a button/link ─────────────────────────────────────────────────
    if any(w in low for w in ("click", "clic", "presion", "pulsa", "haz clic", "submit", "envia", "inicia ses", "log in", "login")):
        label = val
        if not label:
            for kw in ("iniciar sesión", "iniciar sesion", "ingresar", "log in", "login", "sign in", "submit", "entrar", "continuar"):
                if kw in low:
                    label = kw
                    break
        clicked = _click(page, label or "")
        if not clicked:
            raise AssertionError(f"No encontré el botón para: {instruction}")
        page.wait_for_timeout(1500)
        return

    # ── Assert / verify text ────────────────────────────────────────────────
    if any(w in low for w in ("verific", "comprob", "valida", "asegur", "verify", "check", "confirm", "deber")):
        needle = val
        if needle:
            try:
                page.get_by_text(needle, exact=False).first.wait_for(timeout=6000)
                return
            except Exception:
                pass
            # Fallback: scan the rendered DOM text (handles split nodes / timing).
            try:
                page.wait_for_timeout(800)
                if needle.lower() in (page.content() or "").lower():
                    return
            except Exception:
                pass
            raise AssertionError(f"No se encontró el texto esperado: '{needle}'")
        page.wait_for_timeout(800)
        return

    # ── Fallback: let the page settle ───────────────────────────────────────
    page.wait_for_timeout(1000)


def _resolve_input(page, low: str):
    """Find the most likely <input> for a typing instruction."""
    is_pw = any(w in low for w in ("contrase", "password", "clave", "pass"))
    is_email = any(w in low for w in ("correo", "email", "e-mail"))
    is_user = any(w in low for w in ("usuario", "user", "nombre de usuario", "username"))
    candidates = []
    if is_pw:
        candidates = ["input[type=password]"]
    elif is_email:
        candidates = ["input[type=email]", "input[name*=email i]", "input[id*=email i]"]
    elif is_user:
        candidates = ["input[name*=user i]", "input[id*=user i]", "input[type=text]"]
    else:
        candidates = ["input[type=text]", "input:not([type=hidden])"]
    for sel in candidates:
        loc = page.locator(sel).first
        try:
            if loc.count() > 0 and loc.is_visible():
                return loc
        except Exception:
            continue
    return None


def _click(page, label: str) -> bool:
    """Click a button/link/submit by accessible name, text, or value."""
    if label:
        for getter in (
            lambda: page.get_by_role("button", name=re.compile(label, re.I)),
            lambda: page.get_by_role("link", name=re.compile(label, re.I)),
            lambda: page.get_by_text(re.compile(label, re.I)),
        ):
            try:
                loc = getter().first
                if loc.count() > 0 and loc.is_visible():
                    loc.click(timeout=5000)
                    return True
            except Exception:
                continue
    for sel in ("button[type=submit]", "input[type=submit]", "button"):
        try:
            loc = page.locator(sel).first
            if loc.count() > 0 and loc.is_visible():
                loc.click(timeout=5000)
                return True
        except Exception:
            continue
    return False


def _screenshot(drv, sb, spec_id, idx) -> str | None:
    try:
        png = drv.call(lambda page: page.screenshot(type="png"))
        path = f"{spec_id}/{idx}.png"
        sb.storage.from_("run-shots").upload(
            path, png, {"content-type": "image/png", "upsert": "true"}
        )
        return sb.storage.from_("run-shots").get_public_url(path)
    except Exception as e:
        print(f"[shot] skipped: {e}")
        return None


# ── Entrypoint ──────────────────────────────────────────────────────────────────
def run(payload: dict):
    run_id = payload["run_id"]
    region = os.environ.get("AWS_REGION", "us-east-1")
    browser_id = os.environ.get("AGENTCORE_BROWSER_ID") or None
    memory_id = os.environ.get("AGENTCORE_MEMORY_ID") or ""

    sb = _sb()
    dp = boto3.client("bedrock-agentcore", region_name=region)

    run = sb.table("runs").select("*, agent:agents(id, client_id, model_id)").eq("id", run_id).single().execute().data
    agent = run.get("agent") or {}
    company_actor = f"company:{agent.get('client_id','none')}"
    agent_actor = f"agent:{agent.get('id','none')}"
    # Prefer the model baked into this agent's runtime env; fall back to the DB.
    model_id = (os.environ.get("BEDROCK_MODEL_ID")
                or agent.get("model_id")
                or "global.anthropic.claude-sonnet-4-6")

    sb.table("runs").update({"status": "running", "started_at": _now()}).eq("id", run_id).execute()
    specs = sb.table("run_specs").select("*").eq("run_id", run_id).execute().data or []

    hints = memory_hydrate(dp, memory_id, company_actor, "lo que sé sobre esta app")
    prefs = memory_hydrate(dp, memory_id, agent_actor, "preferencias de testing del agente")
    if hints or prefs:
        print(f"[memory] {len(hints)} app hints + {len(prefs)} agent prefs loaded")

    results = []
    for spec in specs:
        try:
            results.append(run_spec(sb, dp, region, browser_id, memory_id, spec,
                                    company_actor, run_id, model_id))
        except Exception as e:
            traceback.print_exc()
            sb.table("run_specs").update({"status": "error", "ended_at": _now(), "summary": str(e)}).eq("id", spec["id"]).execute()
            results.append("error")

    agg = "error" if "error" in results else "failed" if "failed" in results else "passed"
    passed = results.count("passed")
    sb.table("runs").update({
        "status": agg, "ended_at": _now(), "summary": f"{passed}/{len(results)} casos aprobados",
    }).eq("id", run_id).execute()
    return {"status": agg, "passed": passed, "total": len(results)}


if __name__ == "__main__":
    import argparse
    from dotenv import load_dotenv

    load_dotenv()
    load_dotenv(".env")
    ap = argparse.ArgumentParser()
    ap.add_argument("--run-id", required=True)
    args = ap.parse_args()
    print(json.dumps(run({"run_id": args.run_id}), indent=2))
