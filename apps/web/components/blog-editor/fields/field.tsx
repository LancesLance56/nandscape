import type { ReactNode } from "react";

export const fieldInputClass =
  "w-full rounded-lg border border-border-strong bg-surface-card px-3 py-2 text-sm text-ink outline-none focus:border-copper";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-slate">{label}</span>
      {children}
    </label>
  );
}
