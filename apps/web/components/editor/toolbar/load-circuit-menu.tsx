"use client";

import { useEffect, useRef, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { DEFAULT_CIRCUITS } from "@/lib/editor/default-circuits";
import { createLoadCircuitCommand } from "@/lib/commands/commands/load-circuit.command";
import { createLoadGraphCommand } from "@/lib/commands/commands/load-graph.command";
import { useCommandDispatch } from "@/hooks/use-command";
import { commandRegistry } from "@/lib/commands/registry";
import { useCustomCircuitsStore, scopeForPuzzle, type CustomCircuit } from "@/store/custom-circuits-store";
import { usePuzzleStore } from "@/store/puzzle-store";
import { ToolbarButton } from "./toolbar-button";

const EMPTY_CIRCUITS: CustomCircuit[] = [];

function FolderIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path
        d="M2 4.2a1 1 0 0 1 1-1h2.8l1.3 1.5H13a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4.2Z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LoadCircuitMenu() {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ left: number; top: number } | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dispatch = useCommandDispatch();

  const scope = usePuzzleStore((s) => scopeForPuzzle(s.activePuzzleSlug));
  const customCircuits = useCustomCircuitsStore((s) => s.byScope[scope] ?? EMPTY_CIRCUITS);
  const removeCustom = useCustomCircuitsStore((s) => s.remove);

  useLayoutEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      setCoords({ left: rect.left - 100, top: rect.bottom + 6 });
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleLoadStarter = (circuitId: string) => {
    dispatch(createLoadCircuitCommand(circuitId));
    setOpen(false);
  };

  const handleLoadCustom = (circuit: CustomCircuit) => {
    dispatch(createLoadGraphCommand(circuit.nodes, circuit.edges, `Load "${circuit.name}"`));
    setOpen(false);
  };

  const handleSave = () => {
    const command = commandRegistry.get("circuit.save");
    if (command) dispatch(command);
    setOpen(false);
  };

  return (
    <div ref={anchorRef} className="relative">
      <ToolbarButton icon={<FolderIcon />} label="Load circuit" active={open} onClick={() => setOpen((o) => !o)} />

      {open &&
        coords &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: "fixed", left: coords.left, top: coords.top, zIndex: 999 }}
            className="w-64 rounded-xl border border-border bg-surface-card py-2 shadow-[0_16px_40px_rgba(21,27,24,0.16)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.6)]"
          >
            <div className="flex flex-col gap-1 px-2 pb-2">
              <div className="flex items-center justify-between px-1">
                <span className=" text-[11px] font-semibold text-slate">
                  My circuits
                </span>
                <button
                  type="button"
                  onClick={handleSave}
                  className="rounded-md border border-border-strong px-1.5 py-0.5 text-[10px] font-semibold text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
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

            <div className="flex max-h-64 flex-col gap-0.5 overflow-y-auto px-2 pt-2">
              <span className="px-1 text-[11px] font-semibold text-slate">
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
          </div>,
          document.body,
        )}
    </div>
  );
}