"use client";

import { create } from "zustand";

// currently not used but maybe in the future to track quiz progress and stuff, maybe for sharing to teachers in classes?

interface CounterState {
  counts: Record<string, number>;
  bump: (key: string, amount?: number) => void;
  reset: (key?: string) => void;
  get: (key: string) => number;
}

export const useCounterStore = create<CounterState>((set, get) => ({
  counts: {},
  bump: (key, amount = 1) =>
    set((s) => ({ counts: { ...s.counts, [key]: (s.counts[key] ?? 0) + amount } })),
  reset: (key) =>
    set((s) => {
      if (!key) return { counts: {} };
      const next = { ...s.counts };
      delete next[key];
      return { counts: next };
    }),
  get: (key) => get().counts[key] ?? 0,
}));

export function useCounter(key: string) {
  const value = useCounterStore((s) => s.counts[key] ?? 0);
  const bump = useCounterStore((s) => s.bump);
  const reset = useCounterStore((s) => s.reset);
  return {
    value,
    bump: (amount = 1) => bump(key, amount),
    reset: () => reset(key),
  };
}
