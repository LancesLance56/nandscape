"use client";

import { useEffect, useRef } from "react";
import { useEditorStore } from "@/store/editor-store";
import { usePuzzleProgressStore } from "@/store/puzzle-progress-store";

const AUTOSAVE_DEBOUNCE_MS = 800;

export function usePuzzleProgressAutosave(puzzleSlug: string | null): void {
  const nodes = useEditorStore((s) => s.nodes);
  const edges = useEditorStore((s) => s.edges);
  const save = usePuzzleProgressStore((s) => s.save);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextRef = useRef(true);

  useEffect(() => {
    skipNextRef.current = true;
  }, [puzzleSlug]);

  useEffect(() => {
    if (!puzzleSlug) return;

    if (skipNextRef.current) {
      skipNextRef.current = false;
      return;
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      save(puzzleSlug, { nodes, edges });
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [puzzleSlug, nodes, edges, save]);
}