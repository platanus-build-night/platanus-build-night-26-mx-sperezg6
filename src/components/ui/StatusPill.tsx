import { cn } from "@/lib/utils";

export type RunStatus = "queued" | "running" | "passed" | "failed" | "error" | "cancelled";

const config: Record<RunStatus, { label: string; dot: string; text: string }> = {
  queued: { label: "En cola", dot: "bg-faint", text: "text-mute" },
  running: { label: "Ejecutando", dot: "bg-warn animate-pulse", text: "text-warn" },
  passed: { label: "Aprobado", dot: "bg-ok", text: "text-ok" },
  failed: { label: "Fallido", dot: "bg-danger", text: "text-danger" },
  error: { label: "Error", dot: "bg-danger", text: "text-danger" },
  cancelled: { label: "Detenido", dot: "bg-faint", text: "text-mute" },
};

export function StatusPill({ status }: { status: RunStatus }) {
  const c = config[status];
  return (
    <span
      className={cn(
        "text-mono inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide",
        c.text,
      )}
    >
      <span className={cn("size-1.5 rounded-full", c.dot)} />
      {c.label}
    </span>
  );
}
