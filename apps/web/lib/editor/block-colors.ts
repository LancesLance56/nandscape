// gate-colors.ts
import { GateType } from "@nandscape/engine";

export const GATE_COLORS: Partial<Record<GateType, string>> = {
  [GateType.NAND]: "var(--copper)",        // was blue — now matches primary accent
  [GateType.AND]: "var(--signal-green)",
  [GateType.OR]: "#E0A339",                 // warm amber, kept
  [GateType.NOR]: "var(--signal-coral)",
  [GateType.XOR]: "#B25A3B",                // rust/terracotta, replaces violet
  [GateType.XNOR]: "#8A8F5C",               // olive, replaces teal
  [GateType.NOT]: "#E05C97",
  [GateType.BUFFER]: "var(--slate)",
};

// block-colors.ts
export const DEFAULT_BLOCK_COLORS: readonly string[] = [
  "#C15A2A", // copper
  "#4CAF7D", // signal green
  "#E0A339", // amber
  "#D9694F", // signal coral
  "#B25A3B", // rust
  "#8A8F5C", // olive
  "#E05C97", // pink
  "#8C8C8C", // neutral gray
];

export function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}