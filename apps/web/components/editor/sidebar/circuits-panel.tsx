"use client";

import { DEFAULT_CIRCUITS } from "@/lib/editor/default-circuits";
import { createLoadCircuitCommand } from "@/lib/commands/commands/load-circuit.command";
import { useCommandDispatch } from "@/hooks/use-command";

export function CircuitsPanel() {
  const dispatch = useCommandDispatch();

  return (
    <div className="flex flex-col gap-2 p-3">
      <span className="px-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate h-auto">
        Starter circuits
      </span>
      {DEFAULT_CIRCUITS.map((circuit) => (
        <button
          key={circuit.id}
          type="button"
          onClick={() => dispatch(createLoadCircuitCommand(circuit.id))}
          className="flex flex-col gap-1 rounded-lg border border-border bg-surface-card px-3 py-2.5 text-left transition-all hover:border-border-strong hover:shadow-md active:scale-[0.98]"
        >
          <span className="text-sm font-semibold text-ink">{circuit.name}</span>
          <span className="text-xs leading-snug text-ink-soft">{circuit.description}</span>
        </button>
      ))}
    </div>
  );
}
