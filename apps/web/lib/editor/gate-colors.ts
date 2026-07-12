import { GateType } from "@nandscape/engine";

export const GATE_COLORS: Partial<Record<GateType, string>> = {
  [GateType.NAND]: "#5B8DEF",
  [GateType.AND]: "#4CAF7D",
  [GateType.OR]: "#E0A339",
  [GateType.NOR]: "#D9694F",
  [GateType.XOR]: "#9B6BD8",
  [GateType.XNOR]: "#3FB6C7",
  [GateType.NOT]: "#E05C97",
  [GateType.BUFFER]: "#8C8C8C",
};