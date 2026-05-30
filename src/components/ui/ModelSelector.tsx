"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { AGENT_MODELS, providerFor, type Provider } from "@/lib/models";
import { ProviderLogo } from "@/components/ui/provider-logos";
import { cn } from "@/lib/utils";

/** Small monochrome provider marker (bordered chip with the provider logo). */
function ProviderGlyph({ provider, className }: { provider: Provider; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-5 shrink-0 place-items-center rounded-[6px] border border-line bg-surface",
        className,
      )}
    >
      <ProviderLogo provider={provider} className="size-3.5 text-ink" />
    </span>
  );
}

const PROVIDER_ORDER: Provider[] = ["Anthropic", "Amazon", "DeepSeek"];

/**
 * Bespoke, icon-rich model selector (no radix/shadcn). Controlled via
 * `value`/`onChange`. Opens on click; closes on outside-click (pointerdown)
 * and Escape — mirrors DropdownMenu.tsx. When `name` is set, posts the value
 * through a hidden input so it flows in a plain <form> submit.
 */
export function ModelSelector({
  value,
  onChange,
  name,
  id,
}: {
  value: string;
  onChange: (id: string) => void;
  name?: string;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const selected = useMemo(
    () => AGENT_MODELS.find((m) => m.id === value) ?? AGENT_MODELS[0],
    [value],
  );

  const groups = useMemo(
    () =>
      PROVIDER_ORDER.map((provider) => ({
        provider,
        models: AGENT_MODELS.filter((m) => providerFor(m.id) === provider),
      })).filter((g) => g.models.length > 0),
    [],
  );

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selectedProvider = providerFor(selected.id);

  return (
    <div ref={rootRef} className="relative">
      {name && <input type="hidden" name={name} value={value} />}

      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-auto min-h-9 w-full items-center justify-between gap-2 rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors hover:border-line-strong focus:border-line-strong",
        )}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <ProviderGlyph provider={selectedProvider} />
          <span className="min-w-0 truncate">
            <span className="text-ink">{selected.label}</span>{" "}
            <span className="text-mute">— {selected.hint}</span>
          </span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-faint" strokeWidth={1.5} />
      </button>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Modelo"
          className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-[var(--radius-sm)] border border-line bg-surface p-1 shadow-lg"
        >
          {groups.map((group) => (
            <div key={group.provider}>
              <div className="text-overline px-2 pb-1 pt-2">{group.provider}</div>
              {group.models.map((m) => {
                const isSelected = m.id === value;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(m.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-surface-2",
                    )}
                  >
                    <ProviderGlyph provider={group.provider} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-ink">{m.label}</span>
                      <span className="block truncate text-xs text-mute">{m.hint}</span>
                    </span>
                    <Check
                      className={cn(
                        "size-4 shrink-0 text-ink transition-opacity",
                        isSelected ? "opacity-100" : "opacity-0",
                      )}
                      strokeWidth={1.5}
                    />
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
