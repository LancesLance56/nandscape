import { gateTypeToString } from "@nandscape/engine";
import type { PuzzleSpec } from "@/types/puzzle";

/**
 * The puzzle-specific halves of the problem browser.
 *
 * Searching, sorting, chips, counts and progress now live in
 * lib/problems/problem-filters, shared with the coding list. What stays here is
 * what only a puzzle has: how to read its gate restriction and budget, and how
 * to say them in words.
 */

export type RestrictionKind = "unrestricted" | "allowed-only" | "disallowed";
export type BudgetKind = "budgeted" | "unbudgeted";

export function restrictionOf(puzzle: PuzzleSpec): RestrictionKind {
  if (puzzle.allowedGateTypes && puzzle.allowedGateTypes.length > 0) return "allowed-only";
  if (puzzle.disallowedGateTypes && puzzle.disallowedGateTypes.length > 0) return "disallowed";
  return "unrestricted";
}

export function budgetOf(puzzle: PuzzleSpec): BudgetKind {
  return puzzle.gateBudget !== null && puzzle.gateBudget !== undefined ? "budgeted" : "unbudgeted";
}

/** The human-readable constraint, shared by the list and the puzzle page. */
export function formatRestriction(puzzle: PuzzleSpec): string {
  if (puzzle.allowedGateTypes && puzzle.allowedGateTypes.length > 0) {
    return `${puzzle.allowedGateTypes.map(gateTypeToString).join(", ")} only`;
  }
  if (puzzle.disallowedGateTypes && puzzle.disallowedGateTypes.length > 0) {
    return `No ${puzzle.disallowedGateTypes.map(gateTypeToString).join(", ")}`;
  }
  return "No restriction";
}

export const RESTRICTION_LABELS: Record<RestrictionKind, string> = {
  unrestricted: "No restriction",
  "allowed-only": "Only certain gates",
  disallowed: "Some gates banned",
};

export const BUDGET_LABELS: Record<BudgetKind, string> = {
  budgeted: "Has a gate budget",
  unbudgeted: "No budget",
};

/** Every active choice, flattened for the "you have these on" chip row. */

