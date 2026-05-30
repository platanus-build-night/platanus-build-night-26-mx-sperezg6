import { Orbit } from "lucide-react";

type Node = { x: number; y: number; r: number; tone: "ok" | "info" | "muted" };

const nodes: Node[] = [
  { x: 70, y: 60, r: 5, tone: "muted" },
  { x: 130, y: 110, r: 7, tone: "info" },
  { x: 90, y: 180, r: 9, tone: "ok" },
  { x: 200, y: 70, r: 6, tone: "muted" },
  { x: 240, y: 150, r: 8, tone: "ok" },
  { x: 180, y: 200, r: 6, tone: "info" },
  { x: 320, y: 90, r: 5, tone: "muted" },
  { x: 360, y: 170, r: 7, tone: "info" },
  { x: 300, y: 220, r: 6, tone: "muted" },
];

const edges: [number, number][] = [
  [0, 1], [1, 2], [1, 3], [3, 4], [4, 5], [4, 7], [3, 6], [7, 8], [5, 2], [4, 8],
];

const toneColor: Record<Node["tone"], string> = {
  ok: "var(--ok)",
  info: "var(--info)",
  muted: "var(--faint)",
};

/** Decorative "cobertura de pruebas" graph — placeholder visual for M1. */
export function CoverageGraph() {
  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[var(--radius-sm)] bg-surface-2">
      <svg viewBox="0 0 430 270" className="size-full" aria-hidden>
        {edges.map(([a, b], i) => (
          <line
            key={i}
            x1={nodes[a].x}
            y1={nodes[a].y}
            x2={nodes[b].x}
            y2={nodes[b].y}
            stroke="var(--line-strong)"
            strokeWidth={1}
          />
        ))}
        {nodes.map((n, i) => (
          <circle key={i} cx={n.x} cy={n.y} r={n.r} fill={toneColor[n.tone]} />
        ))}
      </svg>

      {/* Central mark */}
      <div className="absolute left-1/2 top-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-line bg-surface shadow-sm">
        <Orbit className="size-6" strokeWidth={1.5} />
      </div>

      {/* Legend */}
      <div className="text-mono absolute bottom-3 right-3 space-y-1 text-[10px] text-mute">
        <p className="flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ background: "var(--ok)" }} /> Páginas OK
        </p>
        <p className="flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ background: "var(--info)" }} /> En prueba
        </p>
        <p className="flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ background: "var(--faint)" }} /> Sin cubrir
        </p>
      </div>
    </div>
  );
}
