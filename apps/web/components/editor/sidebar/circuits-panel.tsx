"use client";

import { DEFAULT_CIRCUITS } from "@/lib/editor/default-circuits";
import { createLoadCircuitCommand } from "@/lib/commands/commands/load-circuit.command";
import { createLoadGraphCommand } from "@/lib/commands/commands/load-graph.command";
import { useCommandDispatch } from "@/hooks/use-command";
import { useEditorStore } from "@/store/editor-store";
import {useCustomCircuitsStore, scopeForPuzzle, CustomCircuit} from "@/store/custom-circuits-store";
import { usePuzzleStore } from "@/store/puzzle-store";

const EMPTY_CIRCUITS: CustomCircuit[] = [];

export function CircuitsPanel() {
  const dispatch = useCommandDispatch();
  const nodes = useEditorStore((s) => s.nodes);
  const edges = useEditorStore((s) => s.edges);

  const scope = usePuzzleStore((s) => scopeForPuzzle(s.activePuzzleSlug));
  const customCircuits = useCustomCircuitsStore((s) => s.byScope[scope] ?? EMPTY_CIRCUITS);
  const saveCustom = useCustomCircuitsStore((s) => s.save);
  const removeCustom = useCustomCircuitsStore((s) => s.remove);

  const handleSave = () => {
    if (nodes.length === 0) return;
    const name = window.prompt("Name this circuit:", "My circuit");
    if (!name) return;
    saveCustom(scope, name, nodes, edges);
  };

  return (
    <div className="flex flex-col gap-5 p-3">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <span className=" text-[11px] font-semibold text-slate">
            My circuits
          </span>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-md border border-border-strong px-2 py-0.5 text-[10px] font-semibold text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
          >
            + Save current
          </button>
        </div>

        {customCircuits.length === 0 && (
          <p className="px-1 text-xs text-ink-soft">
            Nothing saved yet,  build something, then hit &ldquo;Save current&rdquo;.
          </p>
        )}

        {customCircuits.map((circuit) => (
          <div
            key={circuit.id}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-card px-3 py-2.5"
          >
            <button
              type="button"
              onClick={() =>
                dispatch(createLoadGraphCommand(circuit.nodes, circuit.edges, `Load "${circuit.name}"`))
              }
              className="flex-1 truncate text-left text-sm font-semibold text-ink hover:text-copper-dark"
            >
              {circuit.name}
            </button>
            <button
              type="button"
              aria-label={`Delete ${circuit.name}`}
              onClick={() => {
                if (window.confirm(`Delete "${circuit.name}"?`)) removeCustom(scope, circuit.id);
              }}
              className="rounded-md px-1.5 py-0.5 text-xs text-ink-soft hover:text-signal-coral"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <span className="px-1 text-[11px] font-semibold text-slate">
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
    </div>
  );
}