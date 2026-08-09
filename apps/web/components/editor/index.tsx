"use client";

import { useEffect, useRef } from "react";
import { commandRegistry } from "@/lib/commands/registry";
import { ALL_REGISTERED_COMMANDS } from "@/lib/commands/commands/registered-commands";
import { shortcutRegistry } from "@/lib/keyboard/shortcut-registry";
import { DEFAULT_SHORTCUTS } from "@/lib/keyboard/default-shortcuts";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { usePuzzleProgressAutosave } from "@/hooks/use-puzzle-progress-autosave";
import { useEditorStore } from "@/store/editor-store";
import { useUiStore } from "@/store/ui-store";
import { usePuzzleStore } from "@/store/puzzle-store";
import { usePuzzleProgressStore } from "@/store/puzzle-progress-store";
import { usePuzzleDataStore } from "@/store/puzzle-data-store";
import { getDefaultCircuit } from "@/lib/editor/default-circuits";
import { buildPuzzleStarterGraph } from "@/lib/puzzles/puzzle-starter-graph";
import { EditorLayout } from "./layout/editor-layout";
import { useSandboxProgressStore } from "@/store/sandbox-progress-store";
import { useSandboxAutosave } from "@/hooks/use-sandbox-autosave";
import { useProjectStore } from "@/store/project-store";
import type { ProjectRecord } from "@/lib/projects/projects";

let commandsRegistered = false;

export interface CircuitEditorProps {
  puzzleSlug?: string;
  projectSlug?: string;
}

export function CircuitEditor({ puzzleSlug, projectSlug }: CircuitEditorProps = {}) {
  const loadRequestId = useRef(0);

  useEffect(() => {
    if (commandsRegistered) return;
    commandsRegistered = true;

    commandRegistry.registerAll(ALL_REGISTERED_COMMANDS);
    shortcutRegistry.registerAll(DEFAULT_SHORTCUTS);
  }, []);

  useEffect(() => {
    const requestId = ++loadRequestId.current;

    if (projectSlug) {
      usePuzzleStore.getState().setActivePuzzle(null);
      useProjectStore.getState().setActive(null);
      useEditorStore.getState().loadGraph([], []);

      void (async () => {
        const res = await fetch(`/api/projects/${projectSlug}`);
        if (loadRequestId.current !== requestId) return;
        if (!res.ok) return;

        const { project } = (await res.json()) as { project: ProjectRecord };
        useEditorStore.getState().loadGraph(project.nodes, project.edges);
        useProjectStore.getState().setActive({
          id: project.id,
          slug: project.slug,
          name: project.name,
          description: project.description,
          visibility: project.visibility,
        });
      })();
      return;
    }

    useProjectStore.getState().setActive(null);

    if (!puzzleSlug) {
      usePuzzleStore.getState().setActivePuzzle(null);
      const sandbox = useSandboxProgressStore.getState();
      if (sandbox.hasSavedProgress) {
        useEditorStore.getState().loadGraph(sandbox.nodes, sandbox.edges);
      } else {
        const starter = getDefaultCircuit("half-adder");
        if (starter) {
          const { nodes, edges } = starter.build();
          useEditorStore.getState().loadGraph(nodes, edges);
        } else {
          useEditorStore.getState().loadGraph([], []);
        }
      }
      return;
    }

    usePuzzleStore.getState().setActivePuzzle(puzzleSlug);
    useUiStore.getState().setSidebarTab("problem");
    useEditorStore.getState().loadGraph([], []);

    void (async () => {
      const [puzzle, saved] = await Promise.all([
        usePuzzleDataStore.getState().fetchPuzzle(puzzleSlug),
        usePuzzleProgressStore.getState().loadOne(puzzleSlug),
      ]);
      if (loadRequestId.current !== requestId) return;

      if (!puzzle) {
        useEditorStore.getState().loadGraph([], []);
        return;
      }

      if (saved && (saved.nodes.length > 0 || saved.edges.length > 0)) {
        useEditorStore.getState().loadGraph(saved.nodes, saved.edges);
      } else {
        const { nodes, edges } = buildPuzzleStarterGraph(puzzle);
        useEditorStore.getState().loadGraph(nodes, edges);
      }
    })();
  }, [puzzleSlug, projectSlug]);

  useKeyboardShortcuts();
  usePuzzleProgressAutosave(puzzleSlug ?? null);
  useSandboxAutosave(!puzzleSlug && !projectSlug);

  return (
    <div className="h-full w-full overflow-hidden bg-surface">
      <EditorLayout />
    </div>
  );
}