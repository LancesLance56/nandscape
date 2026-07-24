"use client";

import type { ReactNode } from "react";

interface CircuitFrameProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function CircuitFrame({ title, subtitle, children }: CircuitFrameProps) {
  return (
    <div className="not-prose my-8 overflow-hidden rounded-2xl border border-border bg-surface-card shadow-[0_16px_40px_rgba(21,27,24,0.08)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
      <div className="flex items-center gap-2.5 border-b border-border bg-surface-2 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-signal-coral" />
        <span className="h-2.5 w-2.5 rounded-full bg-copper" />
        <span className="h-2.5 w-2.5 rounded-full bg-signal-green" />
        <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink">{title}</span>
        {subtitle && <span className="ml-auto font-mono text-[10px] text-slate">{subtitle}</span>}
      </div>
      <div className="bg-[radial-gradient(var(--border-strong)_1px,transparent_1px)] p-5 sm:p-6">
        {children}
      </div>
    </div>
  );
}