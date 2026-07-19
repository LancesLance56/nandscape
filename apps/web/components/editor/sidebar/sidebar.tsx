"use client";

import {useUiStore} from "@/store/ui-store";
import {ProblemPanel} from "./problem-panel";
import {GatePalette} from "./gate-palette";
import type {SidebarTab} from "@/types/editor";

const TABS: { id: SidebarTab; label: string }[] = [
  {id: "problem", label: "Problem"},
  {id: "palette", label: "Palette"},
];

export function Sidebar() {
  const activeTab = useUiStore((s) => s.sidebarTab);
  const setTab = useUiStore((s) => s.setSidebarTab);

  return (
    <div className="flex h-full flex-col bg-surface-card">
      <div className="flex gap-1 rounded-t-2xl bg-surface-2 p-1.5">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setTab(tab.id)}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
              activeTab === tab.id
                ? "bg-surface-card text-ink shadow-sm"
                : "text-ink-soft hover:bg-surface-card/60 hover:text-ink"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        {activeTab === "problem" && <ProblemPanel/>}
        {activeTab === "palette" && <GatePalette/>}
      </div>
    </div>
  );
}