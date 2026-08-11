"use client";

import React, {useEffect, useMemo} from "react";
import { GateType } from "@nandscape/engine";
import { PaletteItem, type PaletteEntry } from "./palette-item";
import { useUiStore } from "@/store/ui-store";
import { useSubcircuitBlocksStore } from "@/store/subcircuit-blocks-store";
import { useScopesStore } from "@/store/scopes-store";
import { usePuzzleStore } from "@/store/puzzle-store";
import { getDefaultPuzzle } from "@/lib/puzzles/default-puzzles";
import { getGateRestriction } from "@/lib/puzzles/gate-restrictions";
import { getBuiltinSubcircuitBlocks } from "@/lib/editor/default-blocks";
import { GATE_COLORS } from "@/lib/editor/gate-colors";
import {usePuzzleDataStore} from "@/store/puzzle-data-store";

const STATIC_GROUPS: { title: string; entries: Omit<PaletteEntry, "color">[] }[] = [
  { title: "Primitive", entries: [{ kind: "gate", gateType: GateType.NAND, label: "NAND", symbol: "NA" }] },
  {
    title: "Derived gates",
    entries: [
      { kind: "gate", gateType: GateType.AND, label: "AND", symbol: "AN" },
      { kind: "gate", gateType: GateType.OR, label: "OR", symbol: "OR" },
      { kind: "gate", gateType: GateType.NOR, label: "NOR", symbol: "NR" },
      { kind: "gate", gateType: GateType.XOR, label: "XOR", symbol: "XO" },
      { kind: "gate", gateType: GateType.XNOR, label: "XNOR", symbol: "XN" },
      { kind: "gate", gateType: GateType.NOT, label: "NOT", symbol: "NT" },
      { kind: "gate", gateType: GateType.BUFFER, label: "Buffer", symbol: "BF" },
    ],
  },
  {
    title: "Sequential",
    entries: [
      { kind: "gate", gateType: GateType.D_LATCH, label: "D Latch", symbol: "DL" },
      { kind: "gate", gateType: GateType.FLIP_FLOP, label: "D Flip-Flop", symbol: "FF" },
      { kind: "gate", gateType: GateType.JK_FLIP_FLOP, label: "JK Flip-Flop", symbol: "JK" },
      { kind: "gate", gateType: GateType.T_FLIP_FLOP, label: "T Flip-Flop", symbol: "TF" },
      { kind: "gate", gateType: GateType.SR_LATCH, label: "SR Latch", symbol: "SR" },
      { kind: "gate", gateType: GateType.COUNTER, label: "Counter", symbol: "CT" },
    ],
  },
  {
    title: "Decoders & Plexers",
    entries: [
      { kind: "gate", gateType: GateType.MULTIPLEXER, label: "Multiplexer", symbol: "MX" },
      { kind: "gate", gateType: GateType.DEMULTIPLEXER, label: "Demultiplexer", symbol: "DX" },
      { kind: "gate", gateType: GateType.DECODER, label: "Decoder", symbol: "DC" },
      { kind: "gate", gateType: GateType.PRIORITY_ENCODER, label: "Priority Encoder", symbol: "PE" },
    ],
  },
  {
    title: "I/O & sources",
    entries: [
      { kind: "input", label: "Input", symbol: "IN" },
      { kind: "output", label: "Output", symbol: "OUT" },
      { kind: "led", label: "LED", symbol: "LED" },
      { kind: "clock", label: "Clock", symbol: "CLK" },
    ],
  },
  {
    title: "Buses",
    entries: [
      { kind: "bus-merge", label: "Bus Merge", symbol: "BM" },
      { kind: "bus-split", label: "Bus Split", symbol: "BS" },
    ],
  },
  {
    title: "Bus I/O",
    entries: [
      { kind: "bus-input", label: "Bus Input", symbol: "BI" },
      { kind: "bus-output", label: "Bus Output", symbol: "BO" },
      { kind: "seven-segment", label: "7-Segment", symbol: "7S" },
    ],
  },
];

function CreateBlockButton() {
  const openDialog = useUiStore((s) => s.openDialog);
  return (
    <button
      type="button"
      onClick={() => openDialog("save-subcircuit")}
      className="w-full rounded-lg border border-dashed border-border-strong px-2 py-2.5 font-mono text-[10px] font-semibold text-ink-soft transition-colors hover:border-copper/50 hover:bg-copper-bg/40 hover:text-copper-dark"
    >
      + New block from canvas
    </button>
  );
}

function PaletteGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-surface-2/40 p-2.5">
      <span className="whitespace-nowrap px-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate">
        {title}
      </span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

export function GatePalette() {
  const customBlocks = useSubcircuitBlocksStore((s) => s.customBlocks);
  const removeBlock = useSubcircuitBlocksStore((s) => s.remove);
  const scopes = useScopesStore((s) => s.scopes);
  const activeScopeId = useScopesStore((s) => s.activeScopeId);
  const activePuzzleSlug = usePuzzleStore((s) => s.activePuzzleSlug);

  useEffect(() => {
    if (activePuzzleSlug) void usePuzzleDataStore.getState().fetchPuzzle(activePuzzleSlug);
  }, [activePuzzleSlug]);

  const puzzleSpec = usePuzzleDataStore((s) =>
    activePuzzleSlug ? s.getPuzzle(activePuzzleSlug) : undefined,
  );

  const restriction = useMemo(() => getGateRestriction(puzzleSpec ?? null), [puzzleSpec]);

  const blocks = useMemo(
    () => [...getBuiltinSubcircuitBlocks(), ...customBlocks],
    [customBlocks],
  );

  const blockEntries: PaletteEntry[] = useMemo(
    () =>
      blocks.map((b) => ({
        kind: "subcircuit" as const,
        blockId: b.id,
        label: b.name,
        symbol: b.name.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase() || "BL",
        color: b.color,
      })),
    [blocks],
  );

  // Any OTHER tab in this project can be dropped in as a subcircuit too,
  // exactly like a saved block (see scope-block.ts) - not the active one,
  // that'd be an immediate self-reference. Reuses the same kind:"subcircuit"
  // drag-drop path as blocks: circuit-canvas.tsx's handleDrop and
  // node-registry.tsx's createSubcircuitNode don't need to know the
  // difference, a scope id and a block id are interchangeable as circuitId.
  const otherScopes = useMemo(() => scopes.filter((s) => s.id !== activeScopeId), [scopes, activeScopeId]);
  const scopeEntries: PaletteEntry[] = useMemo(
    () =>
      otherScopes.map((s) => {
        // `name` should always be set (every constructor - makeScope,
        // addScope, the sandbox-progress migration - requires one), but
        // this reads from persisted localStorage / a DB row / an imported
        // JSON file, none of which the type system can actually guarantee
        // at runtime - fall back rather than crash on a malformed one.
        const name = s.name || "Untitled circuit";
        return {
          kind: "subcircuit" as const,
          blockId: s.id,
          label: name,
          symbol: name.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase() || "CV",
        };
      }),
    [otherScopes],
  );

  return (
    <div
      className="flex h-full flex-col gap-4 overflow-y-auto overflow-x-hidden p-3
        [scrollbar-width:none]
        [&::-webkit-scrollbar]:hidden"
    >
      {STATIC_GROUPS.map((group) => {
        const items = group.entries
          .map((entry) => ({
            entry,
            allowed: entry.kind !== "gate" || !restriction ? true : restriction.isAllowed(entry.gateType!),
          }))
          .filter(({ allowed }) => allowed || restriction?.mode !== "hide");

        if (items.length === 0) return null;

        return (
          <PaletteGroup key={group.title} title={group.title}>
            {items.map(({ entry, allowed }) => (
              <PaletteItem
                key={entry.label}
                entry={{
                  ...entry,
                  color: entry.kind === "gate" ? GATE_COLORS[entry.gateType!] : undefined,
                }}
                disabled={!allowed}
                disabledReason={allowed ? undefined : "Not allowed for this puzzle"}
              />
            ))}
          </PaletteGroup>
        );
      })}

      {/* Circuit blocks let a solver import a pre-built answer wholesale, so
          they're unavailable inside puzzles,  see grade-puzzle.ts's matching
          structural check, which rejects subcircuit nodes even if one gets
          onto the canvas some other way (e.g. pasted from a saved graph). */}
      {!activePuzzleSlug && (
        <>
          {scopeEntries.length > 0 && (
            <PaletteGroup title="This project's circuits">
              {scopeEntries.map((entry) => (
                <PaletteItem key={entry.blockId} entry={entry} />
              ))}
            </PaletteGroup>
          )}

          <PaletteGroup title="Circuit blocks">
            {blockEntries.map((entry, i) => {
              const block = blocks[i];
              return (
                <PaletteItem
                  key={block.id}
                  entry={entry}
                  onDeleteAction={block.builtIn ? undefined : () => removeBlock(block.id)}
                />
              );
            })}
          </PaletteGroup>

          <CreateBlockButton />
        </>
      )}
    </div>
  );
}