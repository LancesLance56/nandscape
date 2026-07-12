"use client";

import { GateType } from "@nandscape/engine";
import { PaletteItem, type PaletteEntry } from "./palette-item";
import { useEditorStore } from "@/store/editor-store";
import { useSubcircuitBlocksStore } from "@/store/subcircuit-blocks-store";
import {getBuiltinSubcircuitBlocks} from "@/lib/editor/default-blocks";
import {useMemo} from "react";

const STATIC_GROUPS: { title: string; entries: PaletteEntry[] }[] = [
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
      { kind: "gate", gateType: GateType.D_FLIP_FLOP, label: "D Flip-Flop", symbol: "FF" },
      { kind: "gate", gateType: GateType.SR_LATCH, label: "SR Latch", symbol: "SR" },
    ],
  },
  {
    title: "I/O & sources",
    entries: [
      { kind: "input", label: "Input", symbol: "IN" },
      { kind: "output", label: "Output", symbol: "OUT" },
    ],
  },
];

function CreateBlockButton() {
  const nodes = useEditorStore((s) => s.nodes);
  const edges = useEditorStore((s) => s.edges);
  const createFromGraph = useSubcircuitBlocksStore((s) => s.createFromGraph);

  const handleCreate = () => {
    if (nodes.length === 0) {
      window.alert("Build something on the canvas first — a block is made from whatever's currently placed.");
      return;
    }
    const name = window.prompt("Name this block:", "My block");
    if (!name) return;
    const result = createFromGraph(name, nodes, edges);
    if ("error" in result) window.alert(result.error);
  };

  return (
    <button
      type="button"
      onClick={handleCreate}
      className="rounded-md border border-dashed border-border-strong px-2 py-1 font-mono text-[10px] font-semibold text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
    >
      + New block from canvas
    </button>
  );
}

export function GatePalette() {
  const customBlocks = useSubcircuitBlocksStore((s) => s.customBlocks); // stable ref, only changes on real mutation
  const removeBlock = useSubcircuitBlocksStore((s) => s.remove);

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

  return (
    <div className="flex flex-col gap-5 p-3 m-0.5">
      {STATIC_GROUPS.map((group) => (
        <div key={group.title} className="flex flex-col gap-2" dir="ltr">
          <span className="px-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate">
            {group.title}
          </span>
          <div className="flex flex-col gap-1.5">
            {group.entries.map((entry) => (
              <PaletteItem key={entry.label} entry={entry} />
            ))}
          </div>
        </div>
      ))}

      <div className="flex flex-col gap-2" dir="ltr">
        <div className="flex items-center justify-between px-1">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-slate">
            Circuit blocks
          </span>
          <CreateBlockButton />
        </div>
        <div className="flex flex-col gap-1.5">
          {blockEntries.map((entry, i) => {
            const block = blocks[i];
            return (
              <PaletteItem
                key={block.id}
                entry={entry}
                onDelete={block.builtIn ? undefined : () => removeBlock(block.id)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}