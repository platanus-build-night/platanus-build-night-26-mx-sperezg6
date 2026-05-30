"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Select } from "@/components/ui/Field";
import { cn } from "@/lib/utils";

const STATUSES = [
  { value: "", label: "Todos" },
  { value: "passed", label: "Aprobados" },
  { value: "failed", label: "Fallidos" },
  { value: "running", label: "Ejecutando" },
  { value: "queued", label: "En cola" },
  { value: "error", label: "Error" },
];

/** Status + agent filters for the executions table; persisted in the URL. */
export function RunsFilters({ agents }: { agents: { id: string; name: string }[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const status = params.get("status") ?? "";
  const agentId = params.get("agent") ?? "";
  const trigger = params.get("trigger") ?? "";
  const range = params.get("range") ?? "";

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/runs${next.toString() ? `?${next}` : ""}`);
  }

  const hasFilters = Boolean(status || agentId || trigger || range);

  return (
    <div className="mb-5 flex flex-wrap items-center gap-3">
      {/* Status segmented control */}
      <div className="inline-flex flex-wrap rounded-md border border-line p-0.5">
        {STATUSES.map((s) => (
          <button
            key={s.value || "all"}
            type="button"
            onClick={() => setParam("status", s.value)}
            aria-pressed={status === s.value}
            className={cn(
              "text-mono rounded-[6px] px-2.5 py-1 text-xs transition-colors",
              status === s.value ? "bg-surface-2 text-ink" : "text-mute hover:text-ink",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Agent filter */}
      <Select
        value={agentId}
        onChange={(e) => setParam("agent", e.target.value)}
        className="h-8 w-auto min-w-[12rem] py-1 text-xs"
      >
        <option value="">Todos los agentes</option>
        {agents.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </Select>

      {/* Origen (trigger) filter */}
      <Select
        value={trigger}
        onChange={(e) => setParam("trigger", e.target.value)}
        className="h-8 w-auto min-w-[10rem] py-1 text-xs"
      >
        <option value="">Todos los orígenes</option>
        <option value="manual">Manual</option>
        <option value="batch">Lote</option>
        <option value="rerun">Re-ejecución</option>
        <option value="scheduled">Programada</option>
      </Select>

      {/* Periodo (date range) filter */}
      <Select
        value={range}
        onChange={(e) => setParam("range", e.target.value)}
        className="h-8 w-auto min-w-[9rem] py-1 text-xs"
      >
        <option value="">Cualquier fecha</option>
        <option value="today">Hoy</option>
        <option value="7d">Últimos 7 días</option>
        <option value="30d">Últimos 30 días</option>
      </Select>

      {hasFilters && (
        <button
          type="button"
          onClick={() => router.push("/runs")}
          className="inline-flex items-center gap-1 text-xs text-mute transition-colors hover:text-ink"
        >
          <X className="size-3.5" strokeWidth={1.75} /> Limpiar
        </button>
      )}
    </div>
  );
}
