"use client";

import {ReactFlowProvider} from "@xyflow/react";
import {Toolbar} from "@/components/editor/toolbar/toolbar";
import {Sidebar} from "@/components/editor/sidebar/sidebar";
import {Inspector} from "@/components/editor/inspector/inspector";
import {CircuitCanvas} from "@/components/editor/canvas/circuit-canvas";
import {SelectionSummaryOverlay} from "@/components/editor/overlays/selection-summary-overlay";
import {ResizablePanel} from "./resizable-panel";
import {ContextMenu} from "@/components/editor/context-menu/context-menu";
import {DialogRoot} from "@/components/editor/dialogs/dialog-root";
import {useUiStore} from "@/store/ui-store";

export function EditorLayout() {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const sidebarWidth = useUiStore((s) => s.sidebarWidth);
  const setSidebarWidth = useUiStore((s) => s.setSidebarWidth);

  const inspectorOpen = useUiStore((s) => s.inspectorOpen);
  const inspectorWidth = useUiStore((s) => s.inspectorWidth);
  const setInspectorWidth = useUiStore((s) => s.setInspectorWidth);

  return (
    <ReactFlowProvider>
      <div className="relative flex h-full min-h-screen max-h-screen w-full flex-col gap-3 overflow-hidden bg-surface p-3">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-60 dark:opacity-30"
          style={{
            background:
              "radial-gradient(60% 50% at 0% 0%, var(--copper-bg), transparent 60%), " +
              "radial-gradient(55% 45% at 100% 100%, var(--signal-green-bg), transparent 60%)",
          }}
        />

        <div className="shrink-0 rounded-2xl border border-border/60 bg-surface-card/90 backdrop-blur-xl shadow-[0_2px_10px_rgba(21,27,24,0.06)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
          <Toolbar/>
        </div>

        <div className="flex min-h-0 flex-1 gap-3">
          {sidebarOpen && (
            <ResizablePanel
              edge="right"
              size={sidebarWidth}
              onResize={setSidebarWidth}
              min={0}
              max={400}
              className="overflow-hidden rounded-2xl border border-border/60 bg-surface-card/95 shadow-[0_2px_10px_rgba(21,27,24,0.06)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.35)]"
            >
              <Sidebar/>
            </ResizablePanel>
          )}

          <div className="relative min-w-0 flex-1 overflow-hidden rounded-2xl border border-border/60 bg-surface-card shadow-[0_2px_10px_rgba(21,27,24,0.06)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
            <CircuitCanvas/>
            <SelectionSummaryOverlay/>
          </div>

          {inspectorOpen && (
            <ResizablePanel
              edge="left"
              size={inspectorWidth}
              onResize={setInspectorWidth}
              min={220}
              max={480}
              className="overflow-hidden rounded-2xl border border-border/60 bg-surface-card/95 shadow-[0_2px_10px_rgba(21,27,24,0.06)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.35)]"
            >
              <Inspector/>
            </ResizablePanel>
          )}
        </div>
      </div>

      <ContextMenu/>
      <DialogRoot/>
    </ReactFlowProvider>
  );
}