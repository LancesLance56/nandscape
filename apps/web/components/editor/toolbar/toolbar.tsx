"use client";

import {ToolbarGroup} from "./toolbar-group";
import {ToolbarButton} from "./toolbar-button";
import {useCommandDispatch} from "@/hooks/use-command";
import {useHistoryStore} from "@/store/history-store";
import {useUiStore} from "@/store/ui-store";
import {useSimulationStore} from "@/store/simulation-store";
import {usePuzzleStore} from "@/store/puzzle-store";
import {commandRegistry} from "@/lib/commands/registry";
import {ThemeToggle} from "@/components/theme-toggle";
import {LoadCircuitMenu} from "@/components/editor/toolbar/load-circuit-menu";
import {SiteNavMenu} from "@/components/editor/toolbar/site-nav-menu";
import {BreadcrumbNav} from "@/components/editor/toolbar/breadcrumb-nav";
import {SimulationSettingsMenu} from "@/components/editor/toolbar/simulation-settings-menu";
import {ImportCircuitButton} from "@/components/editor/toolbar/import-circuit-button";
import {GateLabelsToggle} from "@/components/editor/toolbar/gate-labels-toggle";

const Icon = {
  Undo: () => (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 8h6.5a3 3 0 1 1 0 6H9" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6.5 5L4 8l2.5 3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Redo: () => (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 8H5.5a3 3 0 1 0 0 6H7" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9.5 5L12 8l-2.5 3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Trash: () => (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5V13a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V4.5" strokeLinecap="round"
            strokeLinejoin="round"/>
    </svg>
  ),
  Sidebar: () => (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="3" width="12" height="10" rx="1.5"/>
      <path d="M6.5 3v10"/>
    </svg>
  ),
  Inspector: () => (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="3" width="12" height="10" rx="1.5"/>
      <path d="M9.5 3v10"/>
    </svg>
  ),
  Block: () => (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 1.5l5.8 3.35v6.7L8 14.9l-5.8-3.35v-6.7L8 1.5z" strokeLinejoin="round"/>
      <path d="M8 8v6.4M8 8L2.4 4.75M8 8l5.6-3.25" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Step: () => (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
      <rect x="10.5" y="3" width="1.6" height="10" rx="0.5"/>
      <path d="M3.5 3.2v9.6a0.8 0.8 0 0 0 1.24.67l6.4-4.8a0.8 0.8 0 0 0 0-1.34l-6.4-4.8a0.8 0.8 0 0 0-1.24.67Z"/>
    </svg>
  ),
  Reset: () => (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M13 8A5 5 0 1 1 11.5 4.2" strokeLinecap="round"/>
      <path d="M13 3v3.5h-3.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Share: () => (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12.5" cy="3.5" r="1.75"/>
      <circle cx="3.5" cy="8" r="1.75"/>
      <circle cx="12.5" cy="12.5" r="1.75"/>
      <path d="M5.1 7.1l5.8-2.7M5.1 8.9l5.8 2.7" strokeLinecap="round"/>
    </svg>
  ),
};

export function Toolbar() {
  const dispatch = useCommandDispatch();
  const canUndo = useHistoryStore((s) => s.canUndo());
  const canRedo = useHistoryStore((s) => s.canRedo());

  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const inspectorOpen = useUiStore((s) => s.inspectorOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const toggleInspector = useUiStore((s) => s.toggleInspector);

  const simStatus = useSimulationStore((s) => s.status);
  const inPuzzle = usePuzzleStore((s) => s.activePuzzleSlug) !== null;

  const runById = (id: string) => {
    const command = commandRegistry.get(id);
    if (command) dispatch(command);
  };

  const statusDot =
    simStatus === "running"
      ? "bg-signal-green"
      : simStatus === "error"
        ? "bg-signal-coral"
        : simStatus === "compiling"
          ? "bg-copper animate-pulse"
          : "bg-border-strong";
  const statusLabel =
    simStatus === "running"
      ? "Simulation running"
      : simStatus === "error"
        ? "Simulation error"
        : simStatus === "compiling"
          ? "Compiling…"
          : "Idle";

  return (
    <div className="grid h-14 grid-cols-[1fr_auto_1fr] items-center gap-2.5 px-3">
      <div className="flex min-w-0 items-center gap-3 justify-self-start">
        <SiteNavMenu/>
        <BreadcrumbNav/>
        <ToolbarGroup>
          <ToolbarButton icon={<Icon.Trash/>} label="Delete selection" shortcut="Del"
                         onClick={() => runById("selection.delete")}/>
          <ToolbarButton icon={<Icon.Undo/>} label="Undo" shortcut="⌘Z" disabled={!canUndo}
                         onClick={() => runById("history.undo")}/>
          <ToolbarButton icon={<Icon.Redo/>} label="Redo" shortcut="⌘⇧Z" disabled={!canRedo}
                         onClick={() => runById("history.redo")}/>
        </ToolbarGroup>
      </div>

      <div className="flex items-center gap-2.5 justify-self-center">
        <span className={`h-2 w-2 rounded-full ${statusDot}`} role="status" title={statusLabel}>
          <span className="sr-only">{statusLabel}</span>
        </span>
        <ToolbarGroup>
          <ToolbarButton icon={<Icon.Step/>} label="Step" shortcut="Space"
                         onClick={() => runById("simulation.step")}/>
          <ToolbarButton icon={<Icon.Reset/>} label="Reset simulation"
                         onClick={() => runById("simulation.reset")}/>
          <SimulationSettingsMenu/>
        </ToolbarGroup>
      </div>

      <div className="flex items-center gap-2.5 justify-self-end">
        {/* Loading a starter/saved circuit or saving the canvas as a reusable
            block would let a solver sidestep the puzzle entirely, so both are
            unavailable inside puzzles,  same rule as the palette's "Circuit
            blocks" section (gate-palette.tsx) and grade-puzzle.ts's matching
            structural check. Sharing doesn't grant that kind of shortcut, so
            it stays available in both modes. */}
        {!inPuzzle && (
          <ToolbarGroup>
            <LoadCircuitMenu/>
            <ImportCircuitButton/>
            <ToolbarButton
              icon={<Icon.Block/>}
              label="Save as circuit block"
              onClick={() => runById("circuit.saveAsBlock")}
            />
          </ToolbarGroup>
        )}
        <ToolbarGroup>
          <ToolbarButton
            icon={<Icon.Share/>}
            label="Share"
            onClick={() => runById("circuit.share")}
          />
        </ToolbarGroup>

        <ToolbarGroup>
          <GateLabelsToggle/>
          <ToolbarButton icon={<Icon.Sidebar/>} label="Toggle sidebar" shortcut="⌘B" active={sidebarOpen}
                         onClick={toggleSidebar}/>
          <ToolbarButton icon={<Icon.Inspector/>} label="Toggle inspector" shortcut="⌘I" active={inspectorOpen}
                         onClick={toggleInspector}/>
        </ToolbarGroup>
        <ThemeToggle/>
      </div>
    </div>
  );
}