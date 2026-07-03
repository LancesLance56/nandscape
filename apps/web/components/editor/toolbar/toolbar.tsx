"use client";

import { ToolbarGroup } from "./toolbar-group";
import { ToolbarButton } from "./toolbar-button";
import { LogoIcon } from "@/components/icons";
import { useCommandDispatch } from "@/hooks/use-command";
import { useHistoryStore } from "@/store/history-store";
import { useUiStore } from "@/store/ui-store";
import { useSimulationStore } from "@/store/simulation-store";
import { commandRegistry } from "@/lib/commands/registry";
import Link from "next/link";
import {ThemeToggle} from "@/components/theme-toggle";

const Icon = {
  Undo: () => (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 8h6.5a3 3 0 1 1 0 6H9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 5L4 8l2.5 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Redo: () => (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 8H5.5a3 3 0 1 0 0 6H7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 5L12 8l-2.5 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Trash: () => (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5V13a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Play: () => (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
      <path d="M4.5 3.5l8 4.5-8 4.5v-9z" />
    </svg>
  ),
  Pause: () => (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
      <rect x="4" y="3.5" width="3" height="9" rx="0.5" />
      <rect x="9" y="3.5" width="3" height="9" rx="0.5" />
    </svg>
  ),
  Sidebar: () => (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="3" width="12" height="10" rx="1.5" />
      <path d="M6.5 3v10" />
    </svg>
  ),
  Inspector: () => (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="3" width="12" height="10" rx="1.5" />
      <path d="M9.5 3v10" />
    </svg>
  ),
  BottomPanel: () => (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="3" width="12" height="10" rx="1.5" />
      <path d="M2 9.5h12" />
    </svg>
  ),
};

export function Toolbar() {
  const dispatch = useCommandDispatch();
  const canUndo = useHistoryStore((s) => s.canUndo());
  const canRedo = useHistoryStore((s) => s.canRedo());

  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const inspectorOpen = useUiStore((s) => s.inspectorOpen);
  const bottomPanelOpen = useUiStore((s) => s.bottomPanelOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const toggleInspector = useUiStore((s) => s.toggleInspector);
  const toggleBottomPanel = useUiStore((s) => s.toggleBottomPanel);

  const simStatus = useSimulationStore((s) => s.status);
  const play = useSimulationStore((s) => s.play);
  const pause = useSimulationStore((s) => s.pause);
  const isRunning = simStatus === "running";

  const runById = (id: string) => {
    const command = commandRegistry.get(id);
    if (command) dispatch(command);
  };

  return (
    <div className="flex h-12 items-center gap-2.5 px-3">
      <ToolbarGroup>
        <Link className="h-10" href="/">
          <LogoIcon/>
        </Link>
        <ThemeToggle />
      </ToolbarGroup>
      <ToolbarGroup>
        <ToolbarButton icon={<Icon.Undo />} label="Undo" shortcut="⌘Z" disabled={!canUndo} onClick={() => runById("history.undo")} />
        <ToolbarButton icon={<Icon.Redo />} label="Redo" shortcut="⌘⇧Z" disabled={!canRedo} onClick={() => runById("history.redo")} />
        <ToolbarButton icon={<Icon.Trash />} label="Delete selection" shortcut="Del" onClick={() => runById("selection.delete")} />
      </ToolbarGroup>

      <ToolbarGroup>
        <ToolbarButton
          icon={isRunning ? <Icon.Pause /> : <Icon.Play />}
          label={isRunning ? "Pause simulation" : "Run simulation"}
          shortcut="Space"
          active={isRunning}
          onClick={() => (isRunning ? pause() : play())}
        />
      </ToolbarGroup>

      <div className="flex-1" />

      <ToolbarGroup>
        <ToolbarButton icon={<Icon.Sidebar />} label="Toggle sidebar" shortcut="⌘B" active={sidebarOpen} onClick={toggleSidebar} />
        <ToolbarButton icon={<Icon.BottomPanel />} label="Toggle bottom panel" shortcut="⌘J" active={bottomPanelOpen} onClick={toggleBottomPanel} />
        <ToolbarButton icon={<Icon.Inspector />} label="Toggle inspector" shortcut="⌘I" active={inspectorOpen} onClick={toggleInspector} />
      </ToolbarGroup>
    </div>
  );
}
