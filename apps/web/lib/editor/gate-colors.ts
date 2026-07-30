import { GateType } from "@nandscape/engine";

export const GATE_COLORS: Partial<Record<GateType, string>> = {
  [GateType.NAND]: "var(--copper)",        // was blue,  now matches primary accent
  [GateType.AND]: "var(--signal-green)",
  [GateType.OR]: "#E0A339",                 // warm amber, kept
  [GateType.NOR]: "var(--signal-coral)",
  [GateType.XOR]: "#B25A3B",                // rust/terracotta, replaces violet
  [GateType.XNOR]: "#8A8F5C",               // olive, replaces teal
  [GateType.NOT]: "#E05C97",
  [GateType.BUFFER]: "var(--slate)",
};