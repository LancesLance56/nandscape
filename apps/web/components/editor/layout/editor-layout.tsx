"use client";

import {ReactFlowProvider} from "@xyflow/react";
import {Toolbar} from "@/components/editor/toolbar/toolbar";
import {Sidebar} from "@/components/editor/sidebar/sidebar";
import {Inspector} from "@/components/editor/inspector/inspector";
import {CircuitCanvas} from "@/components/editor/canvas/circuit-canvas";
import {SelectionSummaryOverlay} from "@/components/editor/overlays/selection-summary-overlay";
import {BottomPanel} from "./bottom-panel";
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

  const bottomPanelOpen = useUiStore((s) => s.bottomPanelOpen);
  const bottomPanelHeight = useUiStore((s) => s.bottomPanelHeight);
  const setBottomPanelHeight = useUiStore((s) => s.setBottomPanelHeight);

  return (
    <ReactFlowProvider>
      <div className="flex h-full min-h-screen max-h-screen w-full flex-col bg-surface">
        <div className="shrink-0 border-b border-border bg-surface-card">
          <Toolbar/>
        </div>

        <div className="flex min-h-0 flex-1">
          {sidebarOpen && (
            <ResizablePanel edge="right" size={sidebarWidth} onResize={setSidebarWidth} min={0} max={400}
                            className="border-r border-border">
              <Sidebar/>
            </ResizablePanel>
          )}

          <div className="relative min-w-0 flex-1">
            <CircuitCanvas/>
            <SelectionSummaryOverlay/>
          </div>

          {inspectorOpen && (
            <ResizablePanel edge="left" size={inspectorWidth} onResize={setInspectorWidth} min={220} max={480}
                            className="border-l border-border">
              <Inspector/>
            </ResizablePanel>
          )}
        </div>

        {bottomPanelOpen && (
          <ResizablePanel edge="top" size={bottomPanelHeight} onResize={setBottomPanelHeight} min={32} max={420}>
            <BottomPanel/>
          </ResizablePanel>
        )}
      </div>

      <ContextMenu/>
      <DialogRoot/>
    </ReactFlowProvider>
  );
}
