"use client";

import { Bot, FlaskConical, Gauge, ShieldAlert } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { formatNumber } from "@/lib/utils";

/* KPI row, wired to real counts from the dashboard data layer. */
export type KpiData = {
  testsRun: number;
  failures: number;
  agents: number;
  successRate: number;
};

export function KpiRow({ data }: { data: KpiData }) {
  const kpis = [
    {
      label: "Tests ejecutados",
      value: formatNumber(data.testsRun),
      vsLast: "acumulado",
      positive: true,
      icon: FlaskConical,
    },
    {
      label: "Fallos detectados",
      value: formatNumber(data.failures),
      vsLast: "en todas las ejecuciones",
      positive: data.failures === 0,
      icon: ShieldAlert,
    },
    {
      label: "Agentes",
      value: formatNumber(data.agents),
      vsLast: "configurados",
      positive: true,
      icon: Bot,
    },
    {
      label: "Tasa de éxito",
      value: `${formatNumber(data.successRate)}%`,
      vsLast: "casos aprobados",
      positive: data.successRate >= 80,
      icon: Gauge,
    },
  ];

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => (
        <StatCard key={kpi.label} {...kpi} />
      ))}
    </div>
  );
}
