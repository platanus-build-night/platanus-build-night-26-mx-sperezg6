"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDown, ArrowUp, Bot } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn, formatNumber } from "@/lib/utils";

type Period = "1D" | "1W" | "1M" | "3M" | "1Y";

const PERIODS: Period[] = ["1D", "1W", "1M", "3M", "1Y"];

type RunPoint = { label: string; runs: number };
type Agent = { name: string; runs: number; passRate: number };
type Trend = { points: RunPoint[]; total: number; deltaPct: number; agents: Agent[] };

function RunsTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: RunPoint }[];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-[var(--radius-sm)] border border-line bg-surface px-2.5 py-1.5 text-xs shadow">
      <p className="text-faint">{point.label}</p>
      <p className="text-mono mt-0.5 font-medium text-ink">
        {formatNumber(point.runs)} ejecuciones
      </p>
    </div>
  );
}

export function RunsTrendCard() {
  const [period, setPeriod] = useState<Period>("1W");
  const [trend, setTrend] = useState<Trend>({ points: [], total: 0, deltaPct: 0, agents: [] });

  useEffect(() => {
    let alive = true;
    fetch(`/api/runs-trend?period=${period}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: Trend) => alive && setTrend(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [period]);

  const data = trend.points;
  const total = trend.total;
  const deltaPct = trend.deltaPct;
  const up = deltaPct >= 0;

  return (
    <div className="flex flex-col rounded-[var(--radius)] border border-line bg-surface p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-overline">Ejecuciones</p>
          <div className="mt-2 flex items-center gap-2.5">
            <span className="text-display text-[2.5rem] leading-none">
              {formatNumber(total)}
            </span>
            <span
              className={cn(
                "text-mono inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-medium",
                up ? "bg-ok-bg text-ok" : "bg-danger-bg text-danger",
              )}
            >
              {up ? <ArrowUp className="size-3" strokeWidth={2} /> : <ArrowDown className="size-3" strokeWidth={2} />}
              {up ? "+" : ""}
              {deltaPct}%
            </span>
          </div>
        </div>
        <Button variant="secondary" size="sm">
          Reporte
        </Button>
      </div>

      {/* Period toggle (segmented control) */}
      <div className="mt-5 inline-flex w-fit rounded-md border border-line p-0.5">
        {PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            aria-pressed={period === p}
            className={cn(
              "text-mono relative rounded-[6px] px-2.5 py-1 text-xs transition-colors",
              period === p ? "text-ink" : "text-mute hover:text-ink",
            )}
          >
            {period === p && (
              <motion.span
                layoutId="period-pill"
                className="absolute inset-0 rounded-[6px] bg-surface-2"
                transition={{ type: "spring", stiffness: 520, damping: 40 }}
              />
            )}
            <span className="relative z-10">{p}</span>
          </button>
        ))}
      </div>

      {/* Area chart */}
      <div className="mt-4 h-[180px] w-full">
        <ResponsiveContainer width="100%" height="100%" minHeight={180}>
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
            <defs>
              <linearGradient id="runsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--ink)" stopOpacity={0.14} />
                <stop offset="100%" stopColor="var(--ink)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="4 4" />
            <XAxis dataKey="label" hide />
            <YAxis
              hide
              domain={[
                (min: number) => Math.floor(min - (min * 0.15 || 10)),
                (max: number) => Math.ceil(max + max * 0.12),
              ]}
            />
            <Tooltip
              content={<RunsTooltip />}
              cursor={{ stroke: "var(--line-strong)", strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="runs"
              stroke="var(--ink)"
              strokeWidth={2}
              fill="url(#runsFill)"
              dot={false}
              activeDot={{ r: 4, fill: "var(--ink)", stroke: "var(--cream)", strokeWidth: 2 }}
              animationDuration={700}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Breakdown: top agents by runs in the period (real data) */}
      <div className="mt-5 border-t border-line pt-4">
        <p className="text-overline mb-3">Agentes destacados</p>
        {trend.agents.length === 0 ? (
          <p className="text-sm text-mute">Sin ejecuciones en este periodo.</p>
        ) : (
          <ul className="space-y-3">
            {trend.agents.map((a) => {
              const good = a.passRate >= 80;
              return (
                <li key={a.name} className="flex items-center gap-3 text-sm">
                  <Bot className="size-4 shrink-0 text-faint" strokeWidth={1.5} />
                  <span className="min-w-0 flex-1 truncate text-ink">{a.name}</span>
                  <span className="text-mono shrink-0 text-mute">
                    {formatNumber(a.runs)} ejec.
                  </span>
                  <span
                    className={cn(
                      "text-mono inline-flex shrink-0 items-center gap-0.5 text-xs tabular-nums",
                      good ? "text-ok" : "text-danger",
                    )}
                  >
                    {good ? (
                      <ArrowUp className="size-3" strokeWidth={2} />
                    ) : (
                      <ArrowDown className="size-3" strokeWidth={2} />
                    )}
                    {a.passRate}%
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
