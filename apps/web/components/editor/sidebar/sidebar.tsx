"use client";

import { useUiStore } from "@/store/ui-store";
import { GatePalette } from "./gate-palette";
import { CircuitsPanel } from "./circuits-panel";
import type { SidebarTab } from "@/types/editor";

const TABS: { id: SidebarTab; label: string }[] = [
  { id: "palette", label: "Palette" },
  { id: "layers", label: "Layers" },
  { id: "circuits", label: "Circuits" },
];

function LayersPanel() {
  return (
    <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-slate">
      Layers panel — lists every node on the canvas once wired up.
    </div>
  );
}

export function Sidebar() {
  const activeTab = useUiStore((s) => s.sidebarTab);
  const setTab = useUiStore((s) => s.setSidebarTab);

  return (
    <div className="flex h-full flex-col bg-surface-card">
      <div className="flex border-b border-border px-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setTab(tab.id)}
            className={`relative px-3 py-2.5 text-xs font-semibold transition-colors ${
              activeTab === tab.id ? "text-ink" : "text-ink-soft hover:text-ink"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-copper" />
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        {activeTab === "palette" && <GatePalette />}
        {activeTab === "layers" && <LayersPanel />}
        {activeTab === "circuits" && <CircuitsPanel />}
      </div>
    </div>
  );
}
