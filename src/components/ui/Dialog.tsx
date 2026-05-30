"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";

/**
 * Lightweight modal. Pass a `trigger` element and a render-prop `children`
 * that receives a `close` callback (call it after a successful submit).
 *
 * The overlay is portaled to <body> so it always centers on the viewport —
 * triggers often live inside ancestors with `transform`/`filter`/`backdrop-blur`
 * (e.g. the sticky Topbar), which would otherwise become the containing block
 * for `position: fixed` and push the modal off-center.
 */
export function Dialog({
  trigger,
  title,
  description,
  children,
}: {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                role="dialog"
                aria-modal="true"
              >
                <motion.div
                  className="absolute inset-0 bg-overlay-ink backdrop-blur-[1px]"
                  onClick={close}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                />
                <motion.div
                  className="relative z-10 w-full max-w-lg rounded-[var(--radius)] border border-line bg-surface shadow-xl"
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 4 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="flex items-start justify-between border-b border-line px-5 py-4">
                    <div>
                      <h2 className="text-base font-medium text-ink">{title}</h2>
                      {description && <p className="mt-0.5 text-sm text-mute">{description}</p>}
                    </div>
                    <button
                      onClick={close}
                      className="grid size-7 place-items-center rounded-md text-faint transition-colors hover:bg-surface-2 hover:text-ink active:scale-90"
                      aria-label="Cerrar"
                    >
                      <X className="size-4" strokeWidth={1.75} />
                    </button>
                  </div>
                  <div className="px-5 py-5">{children(close)}</div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
