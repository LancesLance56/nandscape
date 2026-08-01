import { create } from "zustand";

interface OpsMeterState {
  count: number;
  bump: (amount?: number) => void;
  reset: () => void;
}

export const useOpsMeterStore = create<OpsMeterState>((set) => ({
  count: 0,
  bump: (amount = 1) => set((s) => ({ count: s.count + amount })),
  reset: () => set({ count: 0 }),
}));
