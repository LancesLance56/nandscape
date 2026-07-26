"use client";
import { useEffect, useRef } from "react";
import { useEditorStore } from "@/store/editor-store";
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
    timeoutRef.current = setTimeout(() => save(nodes, edges), AUTOSAVE_DEBOUNCE_MS);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [active, nodes, edges, save]);
}