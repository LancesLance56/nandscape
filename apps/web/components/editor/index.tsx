"use client";

import { useEffect, useRef } from "react";
import { commandRegistry } from "@/lib/commands/registry";
import { ALL_REGISTERED_COMMANDS } from "@/lib/commands/commands/registered-commands";
import { shortcutRegistry } from "@/lib/keyboard/shortcut-registry";
import { DEFAULT_SHORTCUTS } from "@/lib/keyboard/default-shortcuts";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { usePuzzleProgressAutosave } from "@/hooks/use-puzzle-progress-autosave";
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
import { useScopesStore } from "@/store/scopes-store";
import { useSubcircuitBlocksStore } from "@/store/subcircuit-blocks-store";
import { makeScope } from "@/lib/editor/make-scope";
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
      useUiStore.getState().setSidebarTab("projects");
      useScopesStore.getState().loadScopes([makeScope("Main")]);

      void (async () => {
        const res = await fetch(`/api/projects/${projectSlug}`);
        if (loadRequestId.current !== requestId) return;
        if (!res.ok) return;

        const { project } = (await res.json()) as { project: ProjectRecord };
        // Own this project now (owner-only branch) - make its embedded
        // custom blocks part of the local library so both the live preview
        // and a real Play run can resolve its subcircuits, and so the
        // blocks show up in the palette for reuse. Existing local blocks
        // with the same id are never overwritten.
        useSubcircuitBlocksStore.getState().hydrateFromSnapshot(project.blocks);
        // Projects saved before tabs existed have no scopes yet - wrap their
        // one flat circuit as a single "Main" tab so old projects keep
        // working unchanged.
        const scopes = project.scopes.length > 0 ? project.scopes : [makeScope("Main", project.nodes, project.edges)];
        useScopesStore.getState().loadScopes(scopes);
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
      useUiStore.getState().setSidebarTab("projects");
      const sandbox = useSandboxProgressStore.getState();
      if (sandbox.hasSavedProgress) {
        useScopesStore.getState().loadScopes(sandbox.scopes, sandbox.activeScopeId);
      } else {
        const starter = getDefaultCircuit("half-adder");
        const { nodes, edges } = starter ? starter.build() : { nodes: [], edges: [] };
        useScopesStore.getState().loadScopes([makeScope("Main", nodes, edges)]);
      }
      return;
    }

    // Puzzles disallow subcircuits/blocks entirely (see grade-puzzle.ts's
    // structural check and gate-palette.tsx's matching restriction), so this
    // scope only exists to keep useScopesStore/ScopeTabs in a consistent
    // state - there's never a second tab to switch to.
    usePuzzleStore.getState().setActivePuzzle(puzzleSlug);
    useUiStore.getState().setSidebarTab("problem");
    useScopesStore.getState().loadScopes([makeScope("Main")]);

    void (async () => {
      const [puzzle, saved] = await Promise.all([
        usePuzzleDataStore.getState().fetchPuzzle(puzzleSlug),
        usePuzzleProgressStore.getState().loadOne(puzzleSlug),
      ]);
      if (loadRequestId.current !== requestId) return;

      if (!puzzle) {
        useScopesStore.getState().loadScopes([makeScope("Main")]);
        return;
      }

      const { nodes, edges } =
        saved && (saved.nodes.length > 0 || saved.edges.length > 0) ? saved : buildPuzzleStarterGraph(puzzle);
      useScopesStore.getState().loadScopes([makeScope("Main", nodes, edges)]);
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