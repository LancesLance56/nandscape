"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { deepClone } from "@/lib/flowchart/edit";
import { isFlowchartSpec, type FlowchartSpec } from "@/lib/flowchart/types";

const HISTORY_LIMIT = 80;
const SAVE_DEBOUNCE_MS = 700;

export type SaveState = "clean" | "saving" | "saved";

export interface FlowchartDoc {
  spec: FlowchartSpec;
  /**
   * Mutate a clone of the current chart.
   *
   * `coalesce` merges this edit into the previous one for undo purposes when
   * the tag matches. Dragging a box emits a spec update per animation frame,
   * and typing emits one per keystroke; without this, undo would rewind a
   * drag one pixel at a time.
   */
  edit: (fn: (draft: FlowchartSpec) => void, coalesce?: string) => void;
  /** Replace the whole chart: a template, a paste, a new document. */
  replace: (spec: FlowchartSpec) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  save: SaveState;
}

interface History {
  past: FlowchartSpec[];
  present: FlowchartSpec;
  future: FlowchartSpec[];
  /** Tag of the edit that produced `present`, for coalescing. */
  tag: string | null;
}

/**
 * The chart being edited, with undo/redo and a draft kept in localStorage.
 *
 * The persistence is not a feature so much as an apology for the alternative:
 * this is a tool with no accounts and no save button, so a refresh or a
 * mistyped URL used to cost the reader everything they had drawn. A draft in
 * localStorage costs nothing and means the tab can be closed.
 *
 * `storageKey` omitted means "do not persist", which is right for the widget
 * embedded in a tutorial: several of those can be on one page, and a chart
 * pulled apart while reading an article is not a document anybody wants back.
 */
export function useFlowchartDoc(initial: FlowchartSpec, storageKey?: string): FlowchartDoc {
  const [history, setHistory] = useState<History>(() => ({
    past: [],
    present: deepClone(initial),
    future: [],
    tag: null,
  }));
  const [save, setSave] = useState<SaveState>("clean");

  // Restoring happens in an effect rather than in the initial state so that
  // the server and the first client render agree; reading localStorage during
  // render would hydrate a different tree than the server sent.
  //
  // This is the case react-hooks/set-state-in-effect is warning about and the
  // one it cannot see is fine: it runs exactly once, on mount, to pull state
  // out of an external store that does not exist during SSR. There is no
  // cascade because nothing it depends on changes again.
  const restored = useRef(false);
  useEffect(() => {
    if (!storageKey || restored.current) return;
    restored.current = true;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (isFlowchartSpec(parsed)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setHistory({ past: [], present: parsed, future: [], tag: null });
      }
    } catch {
      // A corrupt or unreadable draft is not worth surfacing: the chart the
      // page opened with is a perfectly good thing to show instead.
    }
  }, [storageKey]);

  const present = history.present;

  useEffect(() => {
    if (!storageKey || !restored.current) return;
    setSave("saving");
    const id = window.setTimeout(() => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(present));
        setSave("saved");
      } catch {
        setSave("clean");
      }
    }, SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [present, storageKey]);

  const edit = useCallback((fn: (draft: FlowchartSpec) => void, coalesce?: string) => {
    setHistory((h) => {
      const draft = deepClone(h.present);
      fn(draft);

      // Same tag as last time: this is a continuation of one gesture, so it
      // replaces the current state rather than stacking on top of it.
      const merge = coalesce !== undefined && coalesce === h.tag;
      const past = merge ? h.past : [...h.past, h.present].slice(-HISTORY_LIMIT);

      return { past, present: draft, future: [], tag: coalesce ?? null };
    });
  }, []);

  const replace = useCallback((spec: FlowchartSpec) => {
    setHistory((h) => ({
      past: [...h.past, h.present].slice(-HISTORY_LIMIT),
      present: deepClone(spec),
      future: [],
      tag: null,
    }));
  }, []);

  const undo = useCallback(() => {
    setHistory((h) => {
      const previous = h.past[h.past.length - 1];
      if (!previous) return h;
      return {
        past: h.past.slice(0, -1),
        present: previous,
        future: [h.present, ...h.future].slice(0, HISTORY_LIMIT),
        tag: null,
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((h) => {
      const next = h.future[0];
      if (!next) return h;
      return {
        past: [...h.past, h.present].slice(-HISTORY_LIMIT),
        present: next,
        future: h.future.slice(1),
        tag: null,
      };
    });
  }, []);

  return useMemo(
    () => ({
      spec: present,
      edit,
      replace,
      undo,
      redo,
      canUndo: history.past.length > 0,
      canRedo: history.future.length > 0,
      save,
    }),
    [present, edit, replace, undo, redo, history.past.length, history.future.length, save],
  );
}
