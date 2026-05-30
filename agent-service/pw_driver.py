"""
Single-thread Playwright driver.

Playwright's *sync* API is greenlet/thread-bound: every call must run on the same
OS thread that started it. Strands executes tools via `asyncio.to_thread`, so tool
calls land on arbitrary worker threads → `greenlet.error: cannot switch to a
different thread`.

PWDriver fixes this by owning the Playwright context + page on ONE dedicated
worker thread and funnelling every operation through it. Callers (Strands tools,
the heuristic executor, screenshots) can run on any thread; they just dispatch a
`fn(page)` closure that is executed on the driver's thread and return its result.
"""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from playwright.sync_api import sync_playwright


class PWDriver:
    def __init__(self):
        # Exactly one worker → every Playwright call runs on the same thread.
        self._ex = ThreadPoolExecutor(max_workers=1, thread_name_prefix="pw")
        self._state: dict = {}

    def start(self, ws_url: str, headers: dict) -> str:
        def _init():
            p = sync_playwright().start()
            browser = p.chromium.connect_over_cdp(ws_url, headers=headers)
            ctx = browser.contexts[0] if browser.contexts else browser.new_context()
            page = ctx.pages[0] if ctx.pages else ctx.new_page()
            self._state.update(p=p, browser=browser, page=page)
            return page.url

        return self._ex.submit(_init).result()

    def call(self, fn):
        """Run fn(page) on the driver thread and return its result (raises on error)."""
        return self._ex.submit(lambda: fn(self._state["page"])).result()

    @property
    def url(self) -> str:
        try:
            return self.call(lambda page: page.url)
        except Exception:
            return ""

    def stop(self):
        def _stop():
            try:
                self._state["p"].stop()
            except Exception:
                pass

        try:
            self._ex.submit(_stop).result(timeout=15)
        except Exception:
            pass
        self._ex.shutdown(wait=False)
