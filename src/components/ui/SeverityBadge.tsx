import { cn } from "@/lib/utils";

export type Severity = "critico" | "alto" | "medio" | "bajo";

const styles: Record<Severity, string> = {
  critico: "bg-danger-bg text-danger",
  alto: "bg-warn-bg text-warn",
  medio: "bg-info-bg text-info",
  bajo: "bg-surface-2 text-mute",
};

const labels: Record<Severity, string> = {
  critico: "Crítico",
  alto: "Alto",
  medio: "Medio",
  bajo: "Bajo",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={cn(
        "text-mono inline-block rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        styles[severity],
      )}
    >
      {labels[severity]}
    </span>
  );
}
