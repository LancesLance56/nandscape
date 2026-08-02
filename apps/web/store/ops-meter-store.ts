"use client";

/**
 * @deprecated This file exists only so old imports of `@/store/ops-meter-store`
 * keep compiling. New code should use `@/store/counter-store` and its
 * `useCounter("some-key")` hook directly. Safe to delete once nothing in the
 * codebase imports `useOpsMeterStore` anymore.
 */
import { useCounterStore } from "./counter-store";

const OPS_METER_KEY = "ops-meter";

export function useOpsMeterStore<T>(
  selector: (s: { count: number; bump: (n?: number) => void; reset: () => void }) => T,
): T {
  const count = useCounterStore((s) => s.counts[OPS_METER_KEY] ?? 0);
  const bump = useCounterStore((s) => s.bump);
  const reset = useCounterStore((s) => s.reset);
  return selector({
    count,
    bump: (n = 1) => bump(OPS_METER_KEY, n),
    reset: () => reset(OPS_METER_KEY),
  });
}
