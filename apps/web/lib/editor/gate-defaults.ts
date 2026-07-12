import {GateType} from "@nandscape/engine";

export function defaultInputCountForGateType(gateType: GateType): number {
  switch (gateType) {
    case GateType.NOT:
    case GateType.BUFFER:
      return 1;
    case GateType.D_FLIP_FLOP:
      return 4; // data, clock, reset, set
    case GateType.TRISTATE_BUFFER:
    case GateType.D_LATCH:
    case GateType.SR_LATCH:
      return 2;
    case GateType.AND:
    case GateType.OR:
    case GateType.NAND:
    case GateType.NOR:
    case GateType.XOR:
    case GateType.XNOR:
    default:
      return 2;
  }
}

export function isVariableArityGate(gateType: GateType): boolean {
  switch (gateType) {
    case GateType.AND:
    case GateType.OR:
    case GateType.NAND:
    case GateType.NOR:
    case GateType.XOR:
    case GateType.XNOR:
      return true;
    default:
      return false;
  }
}
