"use client";

import {ToolbarGroup} from "./toolbar-group";
import {ToolbarButton} from "./toolbar-button";
import {useCommandDispatch} from "@/hooks/use-command";
import {useHistoryStore} from "@/store/history-store";
import {useUiStore} from "@/store/ui-store";
import {useSimulationStore} from "@/store/simulation-store";
import {commandRegistry} from "@/lib/commands/registry";
import {ThemeToggle} from "@/components/theme-toggle";
import {LoadCircuitMenu} from "@/components/editor/toolbar/load-circuit-menu";
import {SiteNavMenu} from "@/components/editor/toolbar/site-nav-menu";
import {BreadcrumbNav} from "@/components/editor/toolbar/breadcrumb-nav";

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
  const play = useSimulationStore((s) => s.play);
  const pause = useSimulationStore((s) => s.pause);
  const isRunning = simStatus === "running";

  const runById = (id: string) => {
    const command = commandRegistry.get(id);
    if (command) dispatch(command);
  };

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

      <button
        type="button"
        aria-label={isRunning ? "Pause simulation" : "Run simulation"}
        aria-pressed={isRunning}
        onClick={() => (isRunning ? pause() : play())}
        className={`group relative flex h-10 w-10 items-center justify-center justify-self-center rounded-full text-white transition-all duration-200 hover:scale-108 active:scale-92 ${
          isRunning
            ? "bg-signal-coral shadow-[0_6px_18px_-2px_rgba(225,84,59,0.55)]"
            : "bg-copper shadow-[0_6px_18px_-2px_rgba(193,90,42,0.55)]"
        }`}
      >
        {isRunning && (
          <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-signal-coral/40"/>
        )}
        <span
          className={`absolute inset-0 rounded-full ring-2 ring-white/20 transition-opacity duration-200 ${
            isRunning ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        />
        {isRunning ? (
          <svg viewBox="0 0 16 16" className="h-4.5 w-4.5" fill="currentColor">
            <rect x="3.4" y="2.8" width="3.2" height="10.4" rx="1"/>
            <rect x="9.4" y="2.8" width="3.2" height="10.4" rx="1"/>
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" className="ml-0.5 h-5 w-5" fill="currentColor">
            <path d="M4 2.6v10.8a1 1 0 0 0 1.53.85l8.6-5.4a1 1 0 0 0 0-1.7l-8.6-5.4A1 1 0 0 0 4 2.6z"/>
          </svg>
        )}
      </button>

      <div className="flex items-center gap-2.5 justify-self-end">
        <ToolbarGroup>
          <LoadCircuitMenu/>
          <ToolbarButton
            icon={<Icon.Block/>}
            label="Save as circuit block"
            onClick={() => runById("circuit.saveAsBlock")}
          />
        </ToolbarGroup>

        <ToolbarGroup>
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