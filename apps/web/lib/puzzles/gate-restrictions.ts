import { GateType } from "@nandscape/engine";
import type { GateRestrictionDisplay, PuzzleSpec } from "@/types/puzzle";

export interface GateRestriction {
  mode: GateRestrictionDisplay;
  isAllowed: (gateType: GateType) => boolean;
}

export function getGateRestriction(puzzle: PuzzleSpec | null | undefined): GateRestriction | null {
  if (!puzzle) return null;

  if (puzzle.allowedGateTypes && puzzle.allowedGateTypes.length > 0) {
    const allowed = new Set(puzzle.allowedGateTypes);
    return {
      mode: puzzle.gateRestrictionDisplay ?? "hide",
      isAllowed: (gateType) => allowed.has(gateType),
    };
  }

  if (puzzle.disallowedGateTypes && puzzle.disallowedGateTypes.length > 0) {
    const disallowed = new Set(puzzle.disallowedGateTypes);
    return {
      mode: puzzle.gateRestrictionDisplay ?? "disable",
      isAllowed: (gateType) => !disallowed.has(gateType),
    };
  }

  return null;
}