"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";

/**
 * The pictures that stand in for each tool on the homepage bento and on
 * /tools: the sorting bars, the graph being explored, the bits counting.
 *
 * They show the thing a tool works on, never its controls. The real widget is
 * one click away; a tile's job is to make someone want to click it, and the
 * subject moving on its own does that better than a row of buttons nobody can
 * read at this size.
 *
 * Three of them move. They loop on a timer that only runs while the drawing is
 * on screen, so a page of them costs nothing once scrolled past, and they hold
 * still under reduced motion on a frame that still says what the tool does.
 */

/* ---------------------------------------------------------------- ticking */

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * A frame counter that loops 0..length-1 every `ms`, paused while the element
 * is off screen (including `display: none`, which never intersects). Under
 * reduced motion it stays on `still`.
 */
export function useTicker<T extends Element>(ms: number, length: number, still: number): [RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [frame, setFrame] = useState(still);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;

    let timer: ReturnType<typeof setInterval> | null = null;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !timer) {
        timer = setInterval(() => setFrame((f) => (f + 1) % length), ms);
      } else if (!entry.isIntersecting && timer) {
        clearInterval(timer);
        timer = null;
      }
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (timer) clearInterval(timer);
    };
  }, [ms, length]);

  return [ref, frame];
}

/* ---------------------------------------------------------- graph traversal */

/** A seven-node graph, laid out left to right in the order BFS reaches it. */
const NODES: Record<string, [number, number]> = {
  A: [50, 130],
  B: [165, 55],
  C: [165, 205],
  D: [280, 40],
  E: [280, 130],
  F: [280, 220],
  G: [390, 130],
};
const ORDER = ["A", "B", "C", "D", "E", "F", "G"];
/** The BFS tree: each edge lights up once its child has been visited. */
const TREE_EDGES: [string, string][] = [
  ["A", "B"],
  ["A", "C"],
  ["B", "D"],
  ["B", "E"],
  ["C", "F"],
  ["D", "G"],
];
/** Edges the search never travels, since both ends are already found. */
const CROSS_EDGES: [string, string][] = [
  ["C", "E"],
  ["E", "G"],
  ["F", "G"],
];
/** The queue after each step. */
const QUEUES = [["A"], ["B", "C"], ["C", "D", "E"], ["D", "E", "F"], ["E", "F", "G"], ["F", "G"], ["G"], []];
/** Steps in a full run: none visited, then one more per step. */
export const BFS_STEPS = ORDER.length + 1;

/**
 * The colours the site's real graph widgets use: the node being visited is
 * copper, visited nodes and the tree edges are green, queued nodes are pale
 * copper. `light` pins them to the light theme, for a drawing that sits on a
 * card that stays white in both themes.
 */
const THEMED = {
  idle: "var(--surface-2)",
  line: "var(--border-strong)",
  copper: "var(--copper)",
  copperDark: "var(--copper-dark)",
  queued: "var(--copper-bg)",
  green: "var(--signal-green)",
  ink: "var(--ink)",
};
const LIGHT = {
  idle: "#e6e5e3",
  line: "#cbc9c7",
  copper: "#c74f1a",
  copperDark: "#a8410f",
  queued: "#fde8dc",
  green: "#2f8a57",
  ink: "#3c4044",
};

export interface BfsGraphProps {
  step: number;
  /** Node radius, in the 440x260 viewBox. */
  r?: number;
  labels?: boolean;
  edge?: number;
  /** Mark the start node with a dashed ring. */
  startRing?: boolean;
  palette?: "theme" | "light";
  className?: string;
  label?: string;
  ref?: RefObject<SVGSVGElement | null>;
}

export function BfsGraph({
  step,
  r = 19,
  labels = true,
  edge = 1.75,
  startRing = false,
  palette = "theme",
  className,
  label,
  ref,
}: BfsGraphProps) {
  const c = palette === "light" ? LIGHT : THEMED;
  const visited = ORDER.slice(0, step);
  const current = step > 0 ? ORDER[step - 1] : null;
  const queue = QUEUES[step] ?? [];
  const line = (a: string, b: string, stroke: string, width: number) => (
    <line
      key={a + b}
      x1={NODES[a][0]}
      y1={NODES[a][1]}
      x2={NODES[b][0]}
      y2={NODES[b][1]}
      stroke={stroke}
      strokeWidth={width}
      className="transition-[stroke,stroke-width] duration-300 motion-reduce:transition-none"
    />
  );

  return (
    <svg
      ref={ref}
      viewBox="0 0 440 260"
      role="img"
      aria-label={label ?? `Breadth-first search from A, ${step} of ${ORDER.length} nodes visited`}
      className={className}
    >
      {CROSS_EDGES.map(([a, b]) => line(a, b, c.line, edge))}
      {TREE_EDGES.map(([a, b]) => {
        const lit = visited.includes(b);
        return line(a, b, lit ? c.green : c.line, lit ? edge * 1.75 : edge);
      })}
      {startRing && (
        <circle cx={NODES.A[0]} cy={NODES.A[1]} r={r + 4.5} fill="none" stroke={c.copper} strokeWidth={1.5} strokeDasharray="3 3" />
      )}
      {ORDER.map((id) => {
        const isCurrent = id === current;
        const isVisited = visited.includes(id) && !isCurrent;
        const isQueued = queue.includes(id);
        const [x, y] = NODES[id];
        return (
          <g key={id}>
            <circle
              cx={x}
              cy={y}
              r={r}
              fill={isCurrent ? c.copper : isVisited ? c.green : isQueued ? c.queued : c.idle}
              stroke={isCurrent ? c.copperDark : c.line}
              strokeWidth={2}
              className="transition-[fill,stroke] duration-300 motion-reduce:transition-none"
            />
            {labels && (
              <text
                x={x}
                y={y + r * 0.27}
                textAnchor="middle"
                fontSize={r * 0.76}
                fontWeight={700}
                fill={isCurrent || isVisited ? "#ffffff" : c.ink}
                className="font-sans"
              >
                {id}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** The graph exploring itself, one node a second, on a loop. */
export function BfsArt(props: Omit<BfsGraphProps, "step" | "ref">) {
  // Still frame: halfway, with a node being visited and two queued.
  const [ref, step] = useTicker<SVGSVGElement>(1000, BFS_STEPS, 3);
  return <BfsGraph {...props} ref={ref} step={step} />;
}

/* ----------------------------------------------------------------- sorting */

/** Bubble sort, recorded once: every comparison is a frame. */
const SORT_FRAMES = (() => {
  const a = [42, 18, 77, 9, 63, 31, 88, 24, 55, 12, 70, 36, 95, 47];
  const frames: { arr: number[]; i: number; sorted: number }[] = [];
  for (let end = a.length - 1; end > 0; end--) {
    for (let i = 0; i < end; i++) {
      frames.push({ arr: a.slice(), i, sorted: a.length - 1 - end });
      if (a[i] > a[i + 1]) [a[i], a[i + 1]] = [a[i + 1], a[i]];
    }
  }
  // Hold on the finished array for a beat before it starts again.
  for (let k = 0; k < 8; k++) frames.push({ arr: a.slice(), i: -1, sorted: a.length });
  return frames;
})();

/** Bars sorting themselves: the pair being compared in copper, the settled tail green. */
export function SortArt({ className }: { className?: string }) {
  const [ref, frame] = useTicker<HTMLSpanElement>(140, SORT_FRAMES.length, 30);
  const f = SORT_FRAMES[frame];
  const max = Math.max(...f.arr);

  return (
    <span ref={ref} role="img" aria-label="Bars being sorted by bubble sort" className={className}>
      {f.arr.map((v, k) => {
        const comparing = k === f.i || k === f.i + 1;
        const settled = k >= f.arr.length - f.sorted;
        return (
          <span
            key={k}
            className="min-w-0 flex-1 rounded-t-[5px] rounded-b-[2px] transition-[height,background-color] duration-100 motion-reduce:transition-none"
            style={{
              height: `${Math.round((v / max) * 100)}%`,
              background: comparing ? "var(--copper)" : settled ? "var(--signal-green)" : "var(--surface-4)",
            }}
          />
        );
      })}
    </span>
  );
}

/* ------------------------------------------------------------------- bits */

function Bit({ on, tone = "copper", children }: { on: boolean; tone?: "copper" | "coral"; children: ReactNode }) {
  const colour = tone === "coral" ? "signal-coral" : "copper";
  return (
    <span
      className="grid h-9 w-7 place-items-center rounded-lg border-2 font-label text-base font-bold transition-colors duration-200 motion-reduce:transition-none"
      style={
        on
          ? {
              borderColor: `var(--${colour})`,
              background: `var(--${colour}-bg)`,
              color: `var(--${tone === "coral" ? "signal-coral-strong" : "copper-dark"})`,
            }
          : { borderColor: "var(--border-strong)", background: "var(--surface-2)", color: "var(--slate)" }
      }
    >
      {children}
    </span>
  );
}

/** A byte counting up, with the number it makes in decimal and hex. */
export function BitsArt() {
  const [ref, n] = useTicker<HTMLSpanElement>(1000, 256, 182);
  const bits = n.toString(2).padStart(8, "0").split("");

  return (
    <span ref={ref} role="img" aria-label={`Eight bits reading ${n}`} className="flex flex-col items-center gap-3">
      <span className="flex gap-[5px]">
        {bits.map((b, i) => (
          <Bit key={i} on={b === "1"}>
            {b}
          </Bit>
        ))}
      </span>
      <span className="font-label text-3xl font-bold leading-none text-ink">
        {n} <span className="text-base text-slate">0x{n.toString(16).toUpperCase().padStart(2, "0")}</span>
      </span>
    </span>
  );
}

/** One byte read as -42 in two's complement, sign bit in coral. */
export function TwosArt() {
  const bits = "11010110".split("");
  return (
    <span role="img" aria-label="Eight bits read as minus 42" className="flex flex-col items-center gap-3">
      <span className="flex gap-[5px]">
        {bits.map((b, i) => (
          <Bit key={i} on={b === "1"} tone={i === 0 ? "coral" : "copper"}>
            {b}
          </Bit>
        ))}
      </span>
      <span className="font-label text-3xl font-bold leading-none text-signal-coral-strong">
        −42 <span className="text-base text-slate">or 214</span>
      </span>
    </span>
  );
}

/* ---------------------------------------------------------- still drawings */

const KMAP_ORANGE = "#ff751a";
const KMAP_BLUE = "#3772ff";

function KmapCells({ on }: { on: Record<number, string> }) {
  return (
    <g fill="var(--surface-3)">
      {Array.from({ length: 16 }, (_, i) => (
        <rect key={i} x={4 + (i % 4) * 29} y={4 + Math.floor(i / 4) * 22} width={25} height={18} rx={4} fill={on[i]} />
      ))}
    </g>
  );
}

/** A solved map: two groups, one of them wrapping round the edges. */
export function KmapArt({ className }: { className?: string }) {
  const o = KMAP_ORANGE;
  const b = KMAP_BLUE;
  return (
    <svg viewBox="0 0 120 92" role="img" aria-label="A Karnaugh map with two groups" className={className}>
      <KmapCells on={{ 1: o, 2: o, 5: o, 6: o, 8: b, 11: b }} />
      <rect x={30} y={1} width={60} height={46} rx={8} fill="none" stroke="var(--copper)" strokeWidth={2} strokeDasharray="4 3" />
    </svg>
  );
}

/** An unsolved map, waiting for someone to group it. */
export function KmapPracticeArt({ className }: { className?: string }) {
  const o = KMAP_ORANGE;
  return (
    <svg viewBox="0 0 120 92" role="img" aria-label="A Karnaugh map waiting to be grouped" className={className}>
      <KmapCells on={{ 0: o, 1: o, 5: o, 6: o, 10: o, 15: o }} />
    </svg>
  );
}

/** Start, a decision, two branches. */
export function FlowArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 100" role="img" aria-label="A small flowchart: start, a decision, two branches" className={className}>
      <g fill="none" stroke="var(--ink-soft)" strokeWidth={2}>
        <rect x={38} y={2} width={44} height={16} rx={8} />
        <path d="M60 18 V30 M40 46 H18 V74 M80 46 H102 V74" />
        <rect x={2} y={74} width={34} height={18} rx={3} />
        <rect x={85} y={74} width={34} height={18} rx={3} />
      </g>
      <path d="M60 30 L80 46 L60 62 L40 46 Z" fill="#2f8a57" />
    </svg>
  );
}

/** A dependency graph with its first two nodes already placed. */
export function TopoArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 130 92" role="img" aria-label="A dependency graph being put in order" className={className}>
      <g stroke="var(--border-strong)" strokeWidth={2} fill="none">
        <path d="M24 26 L56 66 M24 70 L56 66 M70 18 L102 44 M70 66 L102 46" />
      </g>
      <path d="M24 26 L56 18" stroke="var(--signal-green)" strokeWidth={3} />
      <circle cx={16} cy={28} r={10} fill="var(--signal-green)" />
      <circle cx={16} cy={70} r={10} fill="var(--surface-3)" stroke="var(--border-strong)" strokeWidth={2} />
      <circle cx={64} cy={18} r={10} fill="var(--signal-green)" />
      <circle cx={64} cy={66} r={10} fill={KMAP_BLUE} />
      <circle cx={110} cy={45} r={10} fill="var(--surface-3)" stroke="var(--border-strong)" strokeWidth={2} />
    </svg>
  );
}

/** Two inputs, one output, the row being checked highlighted. */
export function TruthArt({ className }: { className?: string }) {
  const rows = [
    ["0", "0", "0"],
    ["0", "1", "1"],
    ["1", "0", "?"],
    ["1", "1", "?"],
  ];
  return (
    <svg viewBox="0 0 120 96" role="img" aria-label="A truth table being filled in" className={className}>
      <g className="font-label" fontSize={11} fontWeight={700} textAnchor="middle">
        <text x={22} y={14} fill="var(--slate)">A</text>
        <text x={52} y={14} fill="var(--slate)">B</text>
        <text x={96} y={14} fill="var(--slate)">F</text>
        <rect x={6} y={40} width={108} height={18} rx={5} fill="var(--copper-bg)" />
        {rows.map((row, i) => (
          <g key={i}>
            <text x={22} y={32 + i * 21} fill="var(--ink)">{row[0]}</text>
            <text x={52} y={32 + i * 21} fill="var(--ink)">{row[1]}</text>
            <text x={96} y={32 + i * 21} fill={i === 1 ? "var(--copper-dark)" : i > 1 ? "var(--slate)" : "var(--ink)"}>
              {row[2]}
            </text>
          </g>
        ))}
      </g>
      <path d="M78 4 V96" stroke="var(--border-strong)" strokeWidth={1.5} />
    </svg>
  );
}
