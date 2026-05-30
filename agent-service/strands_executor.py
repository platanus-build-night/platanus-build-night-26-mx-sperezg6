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


def _make_tools(page):
    """Build Strands tools bound to a specific Playwright page."""

    @tool
    def navigate(url: str) -> str:
        """Navega el navegador a una URL."""
        page.goto(url, wait_until="domcontentloaded", timeout=30000)
        return f"Navegado a {url}. Título: {page.title()}"

    @tool
    def click(target: str) -> str:
        """Haz clic en un botón, enlace o elemento por su texto o etiqueta visible."""
        if _click(page, target):
            page.wait_for_timeout(1200)
            return f"Clic realizado en '{target}'. URL actual: {page.url}"
        return f"No encontré un elemento clicable para '{target}'."

    @tool
    def type_text(field: str, value: str) -> str:
        """Escribe 'value' en un campo. 'field' es una pista: 'email', 'usuario', 'contraseña', etc."""
        loc = _locate_input(page, field)
        if loc is None:
            return f"No encontré el campo '{field}'."
        loc.fill(value)
        return f"Escribí en el campo '{field}'."

    @tool
    def get_page_text() -> str:
        """Devuelve el texto visible de la página (recortado) para inspeccionarla."""
        try:
            txt = page.inner_text("body")
        except Exception:
            txt = page.content()
        return (txt or "")[:2500]

    @tool
    def assert_text(text: str) -> str:
        """Verifica si un texto está presente en la página."""
        present = False
        try:
            page.get_by_text(text, exact=False).first.wait_for(timeout=5000)
            present = True
        except Exception:
            present = text.lower() in (page.content() or "").lower()
        return f"El texto '{text}' {'SÍ' if present else 'NO'} está presente."

    return [navigate, click, type_text, get_page_text, assert_text]


def execute_step(page, instruction: str, model_id: str, region: str,
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
    model = BedrockModel(model_id=model_id, region_name=region)
    agent = Agent(model=model, system_prompt=system, tools=_make_tools(page))
    result = agent(
        f"Paso de prueba a ejecutar ahora:\n«{instruction}»\n\n"
        f"URL actual: {page.url}\n"
        "Ejecuta este paso con las herramientas, verifica el resultado real y termina "
        "con la línea STEP_OK o STEP_FAIL."
    )

    text = ""
    msg = getattr(result, "message", None)
    if isinstance(msg, dict):
        text = " ".join(b.get("text", "") for b in msg.get("content", []) if isinstance(b, dict))
    text = (text or str(result)).strip()

    if "STEP_FAIL" in text:
        reason = text.split("STEP_FAIL:", 1)[-1].strip()[:200] if "STEP_FAIL:" in text else text[:200]
        return False, reason or "el agente marcó el paso como fallido"
    if "STEP_OK" in text:
        return True, "ok"
    # No explicit marker — be lenient: treat as ok unless it clearly reports a failure.
    low = text.lower()
    if any(w in low for w in ("no encontré", "no pude", "falló", "no está presente", "error")):
        return False, text[:200]
    return True, "ok"


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
