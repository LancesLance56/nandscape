import {create} from "zustand";
import {persist} from "zustand/middleware";
import type {SidebarTab, InspectorTab, BottomPanelTab} from "@/types/editor";

export interface UiState {
  sidebarOpen: boolean;
  sidebarTab: SidebarTab;
  sidebarWidth: number;

  inspectorOpen: boolean;
  inspectorTab: InspectorTab;
  inspectorWidth: number;

  bottomPanelOpen: boolean;
  bottomPanelTab: BottomPanelTab;

  contextMenu: { x: number; y: number; targetId: string | null; targetType: "node" | "edge" | "pane" } | null;
  activeDialog: string | null;

  toggleSidebar: () => void;
  setSidebarTab: (tab: SidebarTab) => void;
  setSidebarWidth: (width: number) => void;

  toggleInspector: () => void;
  setInspectorTab: (tab: InspectorTab) => void;
  setInspectorWidth: (width: number) => void;

  toggleBottomPanel: () => void;
  setBottomPanelTab: (tab: BottomPanelTab) => void;

  openContextMenu: (menu: {
    x: number;
    y: number;
    targetId: string | null;
    targetType: "node" | "edge" | "pane"
  }) => void;
  closeContextMenu: () => void;

  openDialog: (dialogId: string) => void;
  closeDialog: () => void;
}

export const MIN_PANEL_WIDTH = 220;
export const MAX_PANEL_WIDTH = 480;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      sidebarTab: "problem",
      sidebarWidth: 260,

      inspectorOpen: true,
      inspectorTab: "properties",
      inspectorWidth: 300,

      bottomPanelOpen: true,
      bottomPanelTab: "palette",

      contextMenu: null,
      activeDialog: null,

      toggleSidebar: () => set((s) => ({sidebarOpen: !s.sidebarOpen})),
      setSidebarTab: (tab) => set({sidebarTab: tab, sidebarOpen: true}),
      setSidebarWidth: (width) =>
        set({sidebarWidth: clamp(width, MIN_PANEL_WIDTH, MAX_PANEL_WIDTH)}),

      toggleInspector: () => set((s) => ({inspectorOpen: !s.inspectorOpen})),
      setInspectorTab: (tab) => set({inspectorTab: tab, inspectorOpen: true}),
      setInspectorWidth: (width) =>
        set({inspectorWidth: clamp(width, MIN_PANEL_WIDTH, MAX_PANEL_WIDTH)}),

      toggleBottomPanel: () => set((s) => ({bottomPanelOpen: !s.bottomPanelOpen})),
      setBottomPanelTab: (tab) => set({bottomPanelTab: tab, bottomPanelOpen: true}),

      openContextMenu: (menu) => set({contextMenu: menu}),
      closeContextMenu: () => set({contextMenu: null}),

      openDialog: (dialogId) => set({activeDialog: dialogId}),
      closeDialog: () => set({activeDialog: null}),
    }),
    {
      name: "nandscape-editor-ui",
      version: 2,
      migrate: (persistedState, persistedVersion) => {
        if (persistedVersion < 1) return undefined;
        return persistedState as UiState;
      },
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        sidebarWidth: state.sidebarWidth,
        inspectorOpen: state.inspectorOpen,
        inspectorWidth: state.inspectorWidth,
        bottomPanelOpen: state.bottomPanelOpen,
      }),
    },

  ),
);
