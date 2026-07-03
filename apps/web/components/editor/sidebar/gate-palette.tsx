import { GateType } from "@nandscape/engine";
import { PaletteItem, type PaletteEntry } from "./palette-item";

const GROUPS: { title: string; entries: PaletteEntry[] }[] = [
  {
    title: "Primitive",
    entries: [{ kind: "gate", gateType: GateType.NAND, label: "NAND", symbol: "NA" }],
  },
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
      { kind: "constant", label: "Constant", symbol: "1/0" },
      { kind: "clock", label: "Clock", symbol: "CLK" },
    ],
  },
];

/**
 * Placeholder content for the "palette" sidebar tab — drag any entry onto
 * the canvas to place it (see canvas/circuit-canvas.tsx's onDrop). Search
 * and favorites/recents are natural follow-ups once this ships.
 */
export function GatePalette() {
  return (
    <div className="flex flex-col gap-5 overflow-y-auto p-3">
      {GROUPS.map((group) => (
        <div key={group.title} className="flex flex-col gap-2">
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
    </div>
  );
}
