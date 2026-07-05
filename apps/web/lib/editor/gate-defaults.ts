import { GateType } from "@nandscape/engine";

/**
 * Mirrors the fixed pin-role conventions in the engine's data/circuit.ts
 * (NOT/BUFFER are unary, D_FLIP_FLOP has 4 named inputs, etc.) so a
 * freshly-placed gate always gets the arity it actually has — this is what
 * was wrong before: every gate defaulted to 2 inputs regardless of type,
 * so NOT and BUFFER rendered a second, unusable input pin.
 */
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

/** Only these gate types have user-adjustable arity — everything else has fixed, named pins. */
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
