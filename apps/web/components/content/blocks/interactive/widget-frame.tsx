"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface WidgetFrameProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function WidgetFrame({ title, subtitle, children, className, contentClassName }: WidgetFrameProps) {
  return (
    <div
      className={cn(
        "not-prose my-8 overflow-hidden rounded-2xl border border-border bg-surface-card shadow-[0_16px_40px_rgba(21,27,24,0.08)] ",
        className,
      )}
    >
      <div className="flex items-center gap-2.5 border-b border-border bg-surface-2 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-signal-coral" />
        <span className="h-2.5 w-2.5 rounded-full bg-copper" />
        <span className="h-2.5 w-2.5 rounded-full bg-signal-green" />
        <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink">{title}</span>
        {subtitle && <span className="ml-auto font-mono text-[10px] text-slate">{subtitle}</span>}
      </div>
      <div
        className={cn(
          "bg-[radial-gradient(var(--border-strong)_1px,transparent_1px)] p-5 sm:p-6",
          contentClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
