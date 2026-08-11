"use client";
import { useEffect, useRef } from "react";
import { useEditorStore } from "@/store/editor-store";
import { useScopesStore } from "@/store/scopes-store";
import { useSandboxProgressStore } from "@/store/sandbox-progress-store";

const AUTOSAVE_DEBOUNCE_MS = 800;

export function useSandboxAutosave(active: boolean): void {
  const nodes = useEditorStore((s) => s.nodes);
  const edges = useEditorStore((s) => s.edges);
  const save = useSandboxProgressStore((s) => s.save);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextRef = useRef(true);

  useEffect(() => { skipNextRef.current = true; }, [active]);

  useEffect(() => {
    if (!active) return;
    if (skipNextRef.current) { skipNextRef.current = false; return; }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      // Commit the live canvas into its tab before snapshotting - scopes-store
      // only reflects the active tab's edits after a commit (see its own
      // "commit on switch" doc comment), so skipping this would persist a
      // stale copy of whichever tab is open.
      useScopesStore.getState().commitActive();
      const { scopes, activeScopeId } = useScopesStore.getState();
      save(scopes, activeScopeId);
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [active, nodes, edges, save]);
}