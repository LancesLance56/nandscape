"use client";

import Link from "next/link";
import { ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { GateType } from "@nandscape/engine";
import { CircuitStage } from "@/components/content/blocks/circuit/circuit-stage";
import { getDefaultCircuit } from "@/lib/editor/default-circuits";
import { GATE_COLORS } from "@/lib/editor/gate-colors";
import { ScrollReveal } from "@/components/scroll-reveal";
import type { EditorNode, EditorEdge } from "@/types/editor";
import type { SubcircuitBlockDefinition } from "@/types/subcircuit-block";

// Built once at module scope, CircuitStage resets its live state whenever
// the nodes/edges array reference changes, so this must stay stable across
// renders (same reason circuit-demo-card.tsx builds its own demo circuit at
// module scope). Full Adder rather than Hero's half-adder card, so a
// visitor who scrolls past both sees two different circuits, not the same
// one twice. Also the fallback when no admin has activated a featured
// circuit yet (see apps/web/lib/featured-circuits/featured-circuits.ts).
const { nodes: defaultNodes, edges: defaultEdges } = getDefaultCircuit("full-adder")!.build();

// Decorative-only stand-ins for gate-palette.tsx's chips - real values
// (color, symbol) so the swatch reads correctly, but no drag handlers or
// store wiring, since this sidebar exists purely to show what the editor
// looks like, not to be a working palette.
const DEMO_PALETTE: { gateType: GateType; symbol: string; label: string }[] = [
  { gateType: GateType.NAND, symbol: "NA", label: "NAND" },
  { gateType: GateType.AND, symbol: "AN", label: "AND" },
  { gateType: GateType.OR, symbol: "OR", label: "OR" },
  { gateType: GateType.XOR, symbol: "XO", label: "XOR" },
  { gateType: GateType.NOT, symbol: "NT", label: "NOT" },
  { gateType: GateType.BUFFER, symbol: "BF", label: "Buffer" },
];

function DemoPaletteChip({ gateType, symbol, label }: { gateType: GateType; symbol: string; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-card px-2.5 py-1.5 shadow-sm">
      <span
        style={{ backgroundColor: GATE_COLORS[gateType] }}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md font-mono text-[9px] font-bold text-white shadow-sm"
      >
        {symbol}
      </span>
      <span className="whitespace-nowrap text-xs font-medium text-ink">{label}</span>
    </div>
  );
}

/**
 * A real CircuitStage (the same read-only-but-interactive renderer blog
 * embeds and project views use, see circuit-stage.tsx), not a screenshot or
 * a video - the inputs are actually clickable and the wires actually
 * animate. Framed like an editor window (title bar, gate palette on the
 * left, an inspector stand-in on the right) so it reads as "this is what
 * the app looks like," not just a bare canvas, with a straight line to the
 * real sandbox for anyone who wants to keep going.
 *
 * The palette and inspector here are decorative only (static markup, no
 * store wiring) - the real ones (gate-palette.tsx, inspector.tsx) are
 * wired into editor-store/ui-store/puzzle-store and have no reason to be
 * mounted on a public marketing page just to look right.
 */
export function LiveDemo({
  featured,
}: {
  /** An admin-activated FeaturedCircuit, fetched server-side in page.tsx -
   *  falls back to the hardcoded Full Adder when none is configured yet. */
  featured?: { name: string; nodes: EditorNode[]; edges: EditorEdge[]; blocks: SubcircuitBlockDefinition[] } | null;
}) {
  const nodes = featured?.nodes ?? defaultNodes;
  const edges = featured?.edges ?? defaultEdges;
  const blocks = featured?.blocks;
  const title = featured?.name ?? "Full Adder";

  return (
    <section className="py-20">
      <ScrollReveal className="mb-8 flex flex-col items-center gap-2 text-center">
        <div className="flex items-center gap-2 font-mono text-sm font-medium text-copper-dark">
          <span className="h-1.75 w-1.75 rounded-full bg-copper" />
          Try it right here
        </div>
        <h2 className="font-display text-3xl font-semibold text-ink">Editor Preview</h2>
        <p className="max-w-xl text-sm leading-relaxed text-ink-soft">
          Beginner friendly, but featureful enough for experts
        </p>
      </ScrollReveal>

      <ScrollReveal delay={100}>
        <div className="overflow-hidden rounded-2xl border border-border bg-surface-card shadow-[0_16px_40px_rgba(21,27,24,0.06)]">
          <div className="flex items-center gap-2.5 border-b border-border bg-surface-2 px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-signal-coral" />
            <span className="h-2.5 w-2.5 rounded-full bg-copper" />
            <span className="h-2.5 w-2.5 rounded-full bg-signal-green" />
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink">
              {title}
            </span>
            <Link
              href="/nandbox"
              className="ml-auto rounded-md bg-copper px-3 py-1.5 font-mono text-[11px] font-semibold text-white transition-colors hover:bg-copper-dark"
            >
              Open in sandbox →
            </Link>
          </div>

          <div className="flex h-[280px] sm:h-[360px] md:h-[440px]">
            <aside className="hidden w-36 shrink-0 flex-col gap-1.5 overflow-hidden border-r border-border bg-surface-2/40 p-2.5 lg:flex">
              <span className="mb-0.5 px-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate">
                Gates
              </span>
              {DEMO_PALETTE.map((entry) => (
                <DemoPaletteChip key={entry.label} {...entry} />
              ))}
            </aside>

            <div className="relative min-w-0 flex-1">
              <ReactFlowProvider>
                <CircuitStage nodes={nodes} edges={edges} blocks={blocks} fitPadding={0.15} />
              </ReactFlowProvider>
            </div>

            <aside className="hidden w-44 shrink-0 flex-col border-l border-border bg-surface-2/40 lg:flex">
              <div className="flex gap-1 bg-surface-2 p-1.5">
                <span className="flex-1 rounded-lg bg-surface-card px-2 py-1.5 text-center font-mono text-[10px] font-semibold text-ink shadow-sm">
                  Properties
                </span>
                <span className="flex-1 rounded-lg px-2 py-1.5 text-center font-mono text-[10px] font-semibold text-ink-soft">
                  Palette
                </span>
              </div>
              <div className="flex flex-col gap-3 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-slate">Gate</span>
                  <span className="rounded-full bg-copper-bg px-2 py-0.5 font-mono text-[10px] font-semibold text-copper-dark">
                    XOR
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-medium text-ink-soft">Label</span>
                  <div className="rounded-lg border border-border-strong bg-surface px-2 py-1.5 text-xs text-ink-soft">
                    XOR
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-medium text-ink-soft">Delay</span>
                  <div className="rounded-lg border border-border-strong bg-surface px-2 py-1.5 text-xs text-ink-soft">
                    1
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
