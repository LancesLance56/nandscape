"use client";

import { useCommandDispatch } from "@/hooks/use-command";
import { commandRegistry } from "@/lib/commands/registry";
import { DEFAULT_CIRCUITS } from "@/lib/editor/default-circuits";
import { createLoadCircuitCommand } from "@/lib/commands/commands/load-circuit.command";
import { createLoadGraphCommand } from "@/lib/commands/commands/load-graph.command";
import { usePuzzleStore } from "@/store/puzzle-store";
import {useCustomCircuitsStore, scopeForPuzzle, CustomCircuit} from "@/store/custom-circuits-store";

export function AddCircuitDialog({ onCloseAction }: { onCloseAction: () => void }) {
  const dispatch = useCommandDispatch();

  const scope = usePuzzleStore((s) => scopeForPuzzle(s.activePuzzleSlug));
  const customCircuits = useCustomCircuitsStore((s) => s.list(scope));
  const removeCustom = useCustomCircuitsStore((s) => s.remove);

  const handleLoadStarter = (circuitId: string) => {
    dispatch(createLoadCircuitCommand(circuitId));
    onCloseAction();
  };

  const handleLoadCustom = (circuit: CustomCircuit) => {
    dispatch(createLoadGraphCommand(circuit.nodes, circuit.edges, `Load "${circuit.name}"`));
    onCloseAction();
  };

  const handleSaveCurrent = () => {
    const command = commandRegistry.get("circuit.save");
    if (command) dispatch(command);
    onCloseAction();
  };

  return (
    <div
      className="w-64 rounded-xl border border-border bg-surface-card py-2 shadow-[0_16px_40px_rgba(21,27,24,0.16)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.6)]"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-col gap-1 px-2 pb-2">
        <div className="flex items-center justify-between px-1">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-slate">
            My circuits
          </span>
          <button
            type="button"
            onClick={handleSaveCurrent}
            className="rounded-md border border-border-strong px-1.5 py-0.5 font-mono text-[10px] font-semibold text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
          >
            + Save current
          </button>
        </div>

        {customCircuits.length === 0 && (
          <p className="px-1 py-1 text-xs text-ink-soft">Nothing saved yet.</p>
        )}

        {customCircuits.map((circuit) => (
          <div key={circuit.id} className="flex items-center gap-1 rounded-lg px-1.5 py-1 hover:bg-surface-2">
            <button
              type="button"
              onClick={() => handleLoadCustom(circuit)}
              className="flex-1 truncate text-left text-sm font-medium text-ink"
            >
              {circuit.name}
            </button>
            <button
              type="button"
              aria-label={`Delete ${circuit.name}`}
              onClick={() => {
                if (window.confirm(`Delete "${circuit.name}"?`)) removeCustom(scope, circuit.id);
              }}
              className="rounded-md px-1 text-xs text-ink-soft hover:text-signal-coral"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="h-px bg-border" />

      <div className="flex max-h-64 flex-col gap-0.5 overflow-y-auto px-2 pt-2 pb-2">
        <span className="px-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate">
          Starter circuits
        </span>
        {DEFAULT_CIRCUITS.map((circuit) => (
          <button
            key={circuit.id}
            type="button"
            onClick={() => handleLoadStarter(circuit.id)}
            className="rounded-lg px-1.5 py-1.5 text-left text-sm text-ink hover:bg-surface-2"
          >
            {circuit.name}
          </button>
        ))}
      </div>
    </div>
  );
}