"use client";

import {useState} from "react";
import {useEditorStore} from "@/store/editor-store";
import {useSubcircuitBlocksStore} from "@/store/subcircuit-blocks-store";

export function SaveSubcircuitDialog({onClose}: { onClose: () => void }) {
  const nodes = useEditorStore((s) => s.nodes);
  const edges = useEditorStore((s) => s.edges);
  const createFromGraph = useSubcircuitBlocksStore((s) => s.createFromGraph);
  const [name, setName] = useState("My block");
  const [error, setError] = useState<string | null>(null);

  const handleCreate = () => {
    if (!name.trim()) {
      setError("Give the block a name.");
      return;
    }
    if (nodes.length === 0) {
      setError("Build something on the canvas first — a block is made from whatever's currently placed.");
      return;
    }
    const result = createFromGraph(name.trim(), nodes, edges);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    onClose();
  };

  return (
    <div
      className="w-80 rounded-2xl border border-border bg-surface-card p-5 shadow-[0_16px_40px_rgba(21,27,24,0.16)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.6)]"
      onClick={(e) => e.stopPropagation()}
    >
      <h2 className="mb-3 font-display text-base font-bold text-ink">Save as circuit block</h2>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-ink-soft">Name</span>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
          }}
          className="rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-ink outline-none focus:border-copper"
        />
      </label>

      {error && <p className="mt-2 text-xs text-signal-coral">{error}</p>}

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-ink-soft hover:text-ink"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleCreate}
          className="rounded-lg bg-copper px-3 py-1.5 text-sm font-semibold text-white hover:bg-copper-dark"
        >
          Create
        </button>
      </div>
    </div>
  );
}