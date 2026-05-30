"""
Strands-based step executor. A Strands Agent (using the agent's selected Bedrock
model) drives a Playwright page — connected to an AgentCore Browser session WE
control — via custom @tool functions. This keeps Strands orchestration while we
retain the session id, live-view URL, and recording artifact.

execute_step(page, instruction, model_id, region) -> (ok: bool, log: str)
"""

from __future__ import annotations

import re
from strands import Agent, tool
from strands.models import BedrockModel


def _log(msg: str) -> None:
    """Verbose log line, flushed so it shows live in local runs + CloudWatch."""
    print(f"[strands] {msg}", flush=True)


# Map Bedrock model ids → Anthropic API model ids, so the same agent config works
# against either backend. Falls back to a sane default if unmapped.
_ANTHROPIC_MODEL_MAP = {
    "claude-haiku-4-5": "claude-haiku-4-5",
    "claude-sonnet-4-6": "claude-sonnet-4-6",
    "claude-sonnet-4-5": "claude-sonnet-4-5",
    "claude-opus-4-7": "claude-opus-4-7",
}


def _anthropic_model_id(bedrock_id: str) -> str:
    for key, anth in _ANTHROPIC_MODEL_MAP.items():
        if key in bedrock_id:
            return anth
    return "claude-haiku-4-5"


def _build_model(model_id: str, region: str):
    """
    Build a Strands model. Prefer the Anthropic Claude API directly when
    ANTHROPIC_API_KEY is set (its own quota — avoids Bedrock's per-day token
    limit); otherwise use Bedrock with adaptive retries on throttling.
    """
    import os

    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if api_key:
        try:
            from strands.models.anthropic import AnthropicModel
            anth_id = _anthropic_model_id(model_id)
            _log(f"using Anthropic API model={anth_id}")
            return AnthropicModel(client_args={"api_key": api_key}, model_id=anth_id, max_tokens=1024)
        except Exception as e:
            _log(f"AnthropicModel unavailable, falling back to Bedrock: {type(e).__name__}: {e}")

    from botocore.config import Config
    cfg = Config(retries={"max_attempts": 5, "mode": "adaptive"})
    _log(f"using Bedrock model={model_id} (adaptive retries)")
    return BedrockModel(model_id=model_id, region_name=region, boto_client_config=cfg)

SYSTEM = """\
Eres un ingeniero de QA autónomo de Timeless. Pruebas aplicaciones web reales
controlando un navegador en la nube a través de herramientas. Tu trabajo es
ejecutar UN paso de prueba en lenguaje natural con rigor y honestidad, como lo
haría un tester humano meticuloso.

## Herramientas
- navigate(url): ir a una URL.
- click(target): hacer clic en un botón/enlace/elemento por su texto o etiqueta visible.
- type_text(field, value): escribir en un campo (field es una pista: 'email', 'usuario', 'contraseña'…).
- get_page_text(): leer el texto visible de la página para inspeccionar el estado real.
- assert_text(text): comprobar si un texto está presente en la página.

## Cómo trabajar
1. Observa primero: tienes una captura de pantalla y el estado de la página. Si dudas
   del estado actual, usa get_page_text() antes de actuar.
2. Ejecuta SOLO el paso que se te pide — no inventes pasos extra ni adelantes el flujo.
3. Después de una acción que cambia la página (click, navigate, envío de formulario),
   vuelve a verificar el resultado real antes de concluir; la UI puede tardar o fallar.
4. Sé eficiente: usa las mínimas herramientas necesarias, sin explicaciones largas.

## Veredicto (estricto y honesto)
- Si el paso es una VERIFICACIÓN ("verificar/comprobar que…"), usa assert_text() o
  get_page_text() y solo declara éxito si la evidencia REAL lo confirma.
- NUNCA asumas éxito sin comprobarlo. Un fallo real del producto es un hallazgo valioso:
  repórtalo, no lo ocultes ni lo "arregles".
- Distingue un fallo del PRODUCTO (la app se comporta mal → STEP_FAIL) de un problema
  tuyo para encontrar un elemento (intenta otra estrategia antes de rendirte).

## Formato de respuesta (OBLIGATORIO)
Cuando termines el paso responde EXACTAMENTE con una de estas líneas:
- "STEP_OK: <motivo breve con la evidencia observada>"  — si el paso se cumplió.
- "STEP_FAIL: <motivo breve y específico>"  — si no se cumplió o una verificación falló.
Nada más después de esa línea."""


# Tools that actually change the page (vs. read-only inspection).
ACTION_TOOLS = {"navigate", "click", "type_text"}


def _make_tools(call, trace: list):
    """
    Build Strands tools. `call(fn)` runs `fn(page)` on the PWDriver's dedicated
    thread (Playwright's sync API is thread-bound). Every invocation is appended
    to `trace` (and logged live) so we can SEE what the agent did.
    """

    def _record(name: str, args: str, result: str) -> str:
        trace.append({"tool": name, "args": args, "result": result})
        _log(f"  tool {name}({args}) -> {result[:140]}")
        return result

    @tool
    def navigate(url: str) -> str:
        """Navega el navegador a una URL."""
        def _do(page):
            try:
                page.goto(url, wait_until="domcontentloaded", timeout=30000)
                return f"OK. URL={page.url} título={page.title()!r}"
            except Exception as e:
                return f"ERROR {type(e).__name__}: {e}"
        return _record("navigate", url, call(_do))

    @tool
    def click(target: str) -> str:
        """Haz clic en un botón, enlace o elemento por su texto o etiqueta visible."""
        def _do(page):
            before = page.url
            if _click(page, target):
                page.wait_for_timeout(1200)
                return f"OK. URL {before} -> {page.url}"
            return "NO_ELEMENT: no encontré un elemento clicable"
        return _record("click", repr(target), call(_do))

    @tool
    def type_text(field: str, value: str) -> str:
        """Escribe 'value' en un campo. 'field' es una pista: 'email', 'usuario', 'contraseña', etc."""
        def _do(page):
            loc = _locate_input(page, field)
            if loc is None:
                return "NO_FIELD: no encontré el campo"
            loc.fill(value)
            return "OK"
        return _record("type_text", f"{field!r},{value!r}", call(_do))

    @tool
    def get_page_text() -> str:
        """Devuelve el texto visible de la página (recortado) para inspeccionarla."""
        def _do(page):
            try:
                txt = page.inner_text("body")
            except Exception:
                txt = page.content()
            return (txt or "")[:2500]
        txt = call(_do)
        # Log a short summary, but return the real text so the model can read it.
        trace.append({"tool": "get_page_text", "args": "", "result": f"{len(txt)} chars"})
        _log(f"  tool get_page_text() -> {len(txt)} chars")
        return txt

    @tool
    def assert_text(text: str) -> str:
        """Verifica si un texto está presente en la página."""
        def _do(page):
            try:
                page.get_by_text(text, exact=False).first.wait_for(timeout=5000)
                return True
            except Exception:
                return text.lower() in (page.content() or "").lower()
        present = call(_do)
        return _record("assert_text", repr(text), "PRESENTE" if present else "AUSENTE")

    return [navigate, click, type_text, get_page_text, assert_text]


def execute_step(call, instruction: str, model_id: str, region: str,
                 extra_instructions: str = "") -> tuple[bool, str]:
    system = SYSTEM
    if extra_instructions.strip():
        # Per-agent instructions configured in the UI — high priority, must be honored.
        system += (
            "\n\n## Instrucciones del agente (definidas por el usuario — PRIORIDAD ALTA)\n"
            "Sigue estas instrucciones en cada paso; tienen prioridad sobre las preferencias "
            "por defecto, salvo el formato de respuesta STEP_OK/STEP_FAIL:\n"
            f"{extra_instructions.strip()}"
        )
    url_before = call(lambda page: page.url)
    trace: list = []
    _log(f"STEP «{instruction}»  (url={url_before})")
    agent = Agent(model=_build_model(model_id, region), system_prompt=system,
                  tools=_make_tools(call, trace))
    try:
        result = agent(
            f"Paso de prueba a ejecutar ahora:\n«{instruction}»\n\n"
            f"URL actual: {url_before}\n"
            "Ejecuta este paso con las herramientas, verifica el resultado real y termina "
            "con la línea STEP_OK o STEP_FAIL."
        )
    except Exception as e:
        # Classify model-availability errors so they surface clearly instead of
        # being mistaken for a product failure or hidden behind a fallback.
        name = type(e).__name__
        msg = str(e)
        if "Throttling" in name or "too many tokens" in msg.lower() or "ThrottlingException" in msg:
            reason = f"MODELO_THROTTLED: límite de tokens de Bedrock alcanzado ({msg[:160]})"
        elif "AccessDenied" in name or "AccessDenied" in msg:
            reason = f"MODELO_SIN_ACCESO: el modelo {model_id} no está habilitado ({msg[:160]})"
        else:
            reason = f"AGENT_ERROR {name}: {msg[:180]}"
        _log(reason)
        return False, _build_log(trace, url_before, _safe_url(call), reason, False)

    text = ""
    msg = getattr(result, "message", None)
    if isinstance(msg, dict):
        text = " ".join(b.get("text", "") for b in msg.get("content", []) if isinstance(b, dict))
    text = (text or str(result)).strip()

    tools_used = [t["tool"] for t in trace]
    actions_used = [t for t in trace if t["tool"] in ACTION_TOOLS]
    _log(f"verdict-text: {text[:200]!r}  | tools={tools_used}")

    # ── Strict grading ──────────────────────────────────────────────────────
    # The #1 failure mode we saw: the model replies "STEP_OK" WITHOUT calling any
    # tool, so the page never changes but the step goes green. Catch that.
    if "STEP_FAIL" in text:
        reason = text.split("STEP_FAIL:", 1)[-1].strip()[:200] if "STEP_FAIL:" in text else text[:200]
        ok, verdict = False, f"STEP_FAIL: {reason or 'el agente marcó el paso como fallido'}"
    elif "STEP_OK" in text and not trace:
        ok, verdict = False, "RECHAZADO: STEP_OK sin usar ninguna herramienta (no se ejecutó/verificó nada real)"
    elif "STEP_OK" in text:
        ok, verdict = True, "STEP_OK: " + text.split("STEP_OK:", 1)[-1].strip()[:160] if "STEP_OK:" in text else "STEP_OK"
    else:
        # No explicit verdict → strict: treat as failed (agent didn't follow protocol).
        ok, verdict = False, f"VEREDICTO_AMBIGUO (sin STEP_OK/STEP_FAIL): {text[:160]}"

    _log(f"=> {'PASS' if ok else 'FAIL'} | {len(actions_used)} acciones | {verdict[:160]}")
    return ok, _build_log(trace, url_before, _safe_url(call), verdict, ok)


def _safe_url(call) -> str:
    try:
        return call(lambda page: page.url)
    except Exception:
        return "?"


def _build_log(trace: list, url_before: str, url_after: str, verdict: str,
               ok: bool) -> str:
    """Human-readable trace stored in run_steps.log for every step (pass or fail)."""
    lines = [f"url: {url_before} -> {url_after}"]
    if not trace:
        lines.append("(el agente NO llamó ninguna herramienta)")
    for t in trace:
        lines.append(f"· {t['tool']}({t['args']}) => {t['result']}")
    lines.append(f"VEREDICTO: {'PASS' if ok else 'FAIL'} — {verdict}")
    return "\n".join(lines)


# ── Actuators (shared with the deterministic executor) ────────────────────────
def _locate_input(page, hint: str):
    h = (hint or "").lower()
    sels = []
    if any(w in h for w in ("contrase", "password", "clave", "pass")):
        sels = ["input[type=password]"]
    elif any(w in h for w in ("correo", "email", "e-mail")):
        sels = ["input[type=email]", "input[name*=email i]", "input[id*=email i]"]
    elif any(w in h for w in ("usuario", "user", "username")):
        sels = ["input[name*=user i]", "input[id*=user i]", "input[type=text]"]
    sels += [f"input[placeholder*='{hint}' i]", f"input[name*='{hint}' i]",
             f"input[id*='{hint}' i]", "input[type=text]", "input:not([type=hidden])", "textarea"]
    for sel in sels:
        try:
            loc = page.locator(sel).first
            if loc.count() > 0 and loc.is_visible():
                return loc
        except Exception:
            continue
    return None


def _click(page, target: str) -> bool:
    if target:
        for getter in (
            lambda: page.get_by_role("button", name=re.compile(re.escape(target), re.I)),
            lambda: page.get_by_role("link", name=re.compile(re.escape(target), re.I)),
            lambda: page.get_by_text(re.compile(re.escape(target), re.I)),
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
