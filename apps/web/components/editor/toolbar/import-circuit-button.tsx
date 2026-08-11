"use client";

import { useRef, useState } from "react";
import { useScopesStore } from "@/store/scopes-store";
import { useSubcircuitBlocksStore } from "@/store/subcircuit-blocks-store";
import { parseCircuitJson } from "@/lib/editor/circuit-file";
import { makeScope } from "@/lib/editor/make-scope";
import { ToolbarButton } from "./toolbar-button";

function ImportIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 10.5V12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 2v7.2M8 9.2L5.2 6.4M8 9.2l2.8-2.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Standalone toolbar action - previously lived inside ShareDialog, but
 * importing a file has nothing to do with sharing/saving a project, so it's
 * its own control now. Replaces every tab in the project, same as opening a
 * different project would (see scopes-store.ts's loadScopes) - older exports
 * that predate tabs get wrapped as a single "Main" tab.
 */
export function ImportCircuitButton() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async (file: File) => {
    setError(null);
    try {
      const parsed = parseCircuitJson(await file.text());
      useSubcircuitBlocksStore.getState().hydrateFromSnapshot(parsed.blocks);
      const scopes = parsed.scopes.length > 0 ? parsed.scopes : [makeScope(parsed.name ?? "Main", parsed.nodes, parsed.edges)];
      useScopesStore.getState().loadScopes(scopes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't read that file.");
      window.setTimeout(() => setError(null), 4000);
    }
  };

  return (
    <div className="relative">
      <ToolbarButton icon={<ImportIcon />} label="Import from JSON" onClick={() => fileInputRef.current?.click()} />
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void handleImport(file);
        }}
      />
      {error && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-56 rounded-lg border border-signal-coral/40 bg-surface-card px-2.5 py-1.5 text-[11px] text-signal-coral shadow-[0_8px_24px_rgba(21,27,24,0.16)]">
          {error}
        </div>
      )}
    </div>
  );
}
