"use client";

import { useCallback, useMemo, useState } from "react";
import { COLOR_NAMES, mColoringSteps, type ColoringPayload } from "@/lib/backtracking/puzzles";
import type { GraphSpec } from "@/lib/graph/types";
import { PanelBox, SegmentedRow, StatReadout, type SegmentedGroup } from "../shared/widget-ui";
import { BacktrackingRunner } from "./backtracking-runner";

/** Warm palette matching the graph widgets' group colours. */
const SWATCHES = ["#C15A2A", "#4CAF7D", "#E0A339", "#5B8FA8"];

const EXAMPLES: { id: string; label: string; graph: GraphSpec; note: string }[] = [
  {
    id: "map",
    label: "Map-like graph",
    note: "Five regions, each bordering several others. Three colours are enough.",
    graph: {
      nodes: [
        { id: "A", x: 120, y: 50 },
        { id: "B", x: 260, y: 50 },
        { id: "C", x: 60, y: 165 },
        { id: "D", x: 190, y: 165 },
        { id: "E", x: 320, y: 165 },
      ],
      edges: [
        { from: "A", to: "B" },
        { from: "A", to: "C" },
        { from: "A", to: "D" },
        { from: "B", to: "D" },
        { from: "B", to: "E" },
        { from: "C", to: "D" },
        { from: "D", to: "E" },
      ],
    },
  },
  {
    id: "k4",
    label: "K4 (all connected)",
    note: "Every node touches every other, so it needs one colour per node. Try it with 3 and watch it fail.",
    graph: {
      nodes: [
        { id: "A", x: 120, y: 45 },
        { id: "B", x: 270, y: 45 },
        { id: "C", x: 120, y: 175 },
        { id: "D", x: 270, y: 175 },
      ],
      edges: [
        { from: "A", to: "B" },
        { from: "A", to: "C" },
        { from: "A", to: "D" },
        { from: "B", to: "C" },
        { from: "B", to: "D" },
        { from: "C", to: "D" },
      ],
    },
  },
  {
    id: "c5",
    label: "5-cycle",
    note: "An odd cycle. Two colours always fail on it, three always work.",
    graph: {
      nodes: [
        { id: "A", x: 195, y: 35 },
        { id: "B", x: 320, y: 120 },
        { id: "C", x: 270, y: 200 },
        { id: "D", x: 120, y: 200 },
        { id: "E", x: 70, y: 120 },
      ],
      edges: [
        { from: "A", to: "B" },
        { from: "B", to: "C" },
        { from: "C", to: "D" },
        { from: "D", to: "E" },
        { from: "E", to: "A" },
      ],
    },
  },
];

function ColoringCanvas({
  graph,
  colors,
  tryNode,
  tryColor,
  conflictWith,
  onNodeClick,
}: {
  graph: GraphSpec;
  colors: Record<string, number>;
  tryNode?: string | null;
  tryColor?: number | null;
  conflictWith?: string | null;
  onNodeClick?: (id: string) => void;
}) {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));

  return (
    <svg viewBox="0 0 390 245" className="w-full rounded-lg border border-border bg-surface-2/40" role="img" aria-label="Graph being coloured">
      {graph.edges.map((e) => {
        const a = byId.get(e.from);
        const b = byId.get(e.to);
        if (!a || !b) return null;

        // An edge whose ends share a colour is the failure the whole problem
        // is about, so it gets drawn loudly rather than left to be inferred.
        const broken =
          colors[e.from] !== undefined && colors[e.from] === colors[e.to];
        const involvesConflict =
          conflictWith !== null &&
          ((e.from === tryNode && e.to === conflictWith) || (e.to === tryNode && e.from === conflictWith));

        return (
          <line
            key={`${e.from}-${e.to}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={broken || involvesConflict ? "var(--signal-coral)" : "var(--border-strong)"}
            strokeWidth={broken || involvesConflict ? 3 : 1.75}
            strokeDasharray={involvesConflict ? "5 3" : undefined}
          />
        );
      })}

      {graph.nodes.map((n) => {
        const c = colors[n.id];
        const isTrying = n.id === tryNode;
        const fill = c !== undefined ? SWATCHES[c % SWATCHES.length] : "var(--surface-2)";

        return (
          <g
            key={n.id}
            onClick={onNodeClick ? () => onNodeClick(n.id) : undefined}
            style={onNodeClick ? { cursor: "pointer" } : undefined}
          >
            {isTrying && <circle cx={n.x} cy={n.y} r={25} fill="none" stroke="var(--copper)" strokeWidth={1.5} strokeDasharray="3 3" />}
            <circle
              cx={n.x}
              cy={n.y}
              r={19}
              fill={fill}
              stroke={n.id === conflictWith ? "var(--signal-coral)" : c !== undefined ? fill : "var(--border-strong)"}
              strokeWidth={n.id === conflictWith ? 3 : 2}
              className="transition-all duration-200"
            />
            <text
              x={n.x}
              y={n.y + 5}
              textAnchor="middle"
              className="text-[13px] font-bold"
              fill={c !== undefined ? "#ffffff" : "var(--ink)"}
              style={{ pointerEvents: "none" }}
            >
              {n.id}
            </text>
            {isTrying && tryColor !== null && tryColor !== undefined && c === undefined && (
              <circle cx={n.x + 15} cy={n.y - 15} r={7} fill={SWATCHES[tryColor % SWATCHES.length]} stroke="var(--surface-card)" strokeWidth={2} />
            )}
          </g>
        );
      })}
    </svg>
  );
}

/**
 * Graph m-colouring, watchable or hands-on.
 *
 * The manual mode exists for the same reason as the n-queens one: being told
 * K4 needs four colours is far less convincing than trying to do it with
 * three and running out of options on the last node every single time.
 */
export function GraphColoringWidget({ data }: { data: Record<string, unknown> }) {
  const [exampleId, setExampleId] = useState(
    typeof data.example === "string" && EXAMPLES.some((e) => e.id === data.example) ? data.example : EXAMPLES[0].id,
  );
  const [m, setM] = useState(typeof data.m === "number" ? Math.min(4, Math.max(2, data.m)) : 3);
  const [manual, setManual] = useState(false);

  const example = EXAMPLES.find((e) => e.id === exampleId) ?? EXAMPLES[0];
  const run = useMemo(() => mColoringSteps(example.graph, m), [example, m]);

  const toggles: SegmentedGroup[] = [
    {
      id: "example",
      label: "Graph",
      active: exampleId,
      onChange: setExampleId,
      options: EXAMPLES.map((e) => ({ id: e.id, label: e.label })),
    },
    {
      id: "m",
      label: "Colours",
      active: String(m),
      onChange: (id) => setM(Number(id)),
      options: [2, 3, 4].map((v) => ({ id: String(v), label: String(v) })),
    },
    {
      id: "mode",
      label: "Mode",
      active: manual ? "manual" : "watch",
      onChange: (id) => setManual(id === "manual"),
      options: [
        { id: "watch", label: "Watch it solve" },
        { id: "manual", label: "Colour it yourself" },
      ],
    },
  ];

  if (manual) return <ManualColoring graph={example.graph} m={m} toggles={toggles} note={example.note} />;

  return (
    <BacktrackingRunner
      run={run}
      toggles={toggles}
      solutionsLabel="Valid colourings"
      hint={example.note}
      visual={(step) => {
        const p = step.payload as ColoringPayload | undefined;
        return (
          <ColoringCanvas
            graph={example.graph}
            colors={p?.colors ?? {}}
            tryNode={p?.tryNode}
            tryColor={p?.tryColor}
            conflictWith={p?.conflictWith ?? null}
          />
        );
      }}
      panel={(step) => {
        const p = step.payload as ColoringPayload | undefined;
        return (
          <PanelBox title="Assignment">
            <div className="flex flex-col gap-1">
              {example.graph.nodes.map((n) => {
                const c = p?.colors[n.id];
                return (
                  <div key={n.id} className="flex items-center justify-between text-xs">
                    <span className="font-bold text-ink">{n.id}</span>
                    {c === undefined ? (
                      <span className="italic text-slate">uncoloured</span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded-full" style={{ background: SWATCHES[c % SWATCHES.length] }} />
                        <span className="font-semibold text-ink-soft">{COLOR_NAMES[c]}</span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </PanelBox>
        );
      }}
    />
  );
}

function ManualColoring({
  graph,
  m,
  toggles,
  note,
}: {
  graph: GraphSpec;
  m: number;
  toggles: SegmentedGroup[];
  note: string;
}) {
  const [colors, setColors] = useState<Record<string, number>>({});

  const cycle = useCallback(
    (id: string) => {
      setColors((prev) => {
        const next = { ...prev };
        const current = next[id];
        // Cycles through the colours then back to uncoloured, so a wrong
        // choice can be undone without a separate control.
        if (current === undefined) next[id] = 0;
        else if (current + 1 < m) next[id] = current + 1;
        else delete next[id];
        return next;
      });
    },
    [m],
  );

  const brokenEdges = graph.edges.filter((e) => colors[e.from] !== undefined && colors[e.from] === colors[e.to]);
  const coloured = Object.keys(colors).length;
  const solved = coloured === graph.nodes.length && brokenEdges.length === 0;

  return (
    <div className="rounded-xl border border-border bg-surface-card p-5">
      <SegmentedRow groups={toggles} className="mb-4" />

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <ColoringCanvas graph={graph} colors={colors} onNodeClick={cycle} />
          <p className="mt-2 text-[11px] text-slate">
            Click a node to cycle it through the {m} colours and back to uncoloured. {note}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <PanelBox title="Progress">
            <StatReadout
              stats={[
                { label: "nodes coloured", value: `${coloured} / ${graph.nodes.length}` },
                { label: "broken edges", value: brokenEdges.length, tone: brokenEdges.length > 0 ? "warn" : "good" },
              ]}
            />
          </PanelBox>

          <PanelBox title="Edges joining two of the same colour">
            {brokenEdges.length === 0 ? (
              <span className="text-xs italic text-slate">none</span>
            ) : (
              <div className="flex flex-col gap-1">
                {brokenEdges.map((e) => (
                  <span key={`${e.from}-${e.to}`} className="text-xs text-signal-coral">
                    {e.from} and {e.to} are both {COLOR_NAMES[colors[e.from]]}
                  </span>
                ))}
              </div>
            )}
          </PanelBox>

          {solved && (
            <p className="rounded-lg border border-signal-green bg-signal-green/10 px-3 py-2 text-sm font-semibold text-signal-green">
              Every node coloured, no edge broken, {m} colours used.
            </p>
          )}

          <button
            type="button"
            onClick={() => setColors({})}
            className="self-start rounded-lg border border-border-strong px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-surface-2 hover:text-ink"
          >
            Clear colours
          </button>
        </div>
      </div>
    </div>
  );
}
