"use client";

import {useUiStore} from "@/store/ui-store";
import type {BottomPanelTab} from "@/types/editor";

const TABS: { id: BottomPanelTab; label: string }[] = [
  {id: "console", label: "Console"},
  {id: "waveform", label: "Waveform"},
  {id: "problems", label: "Problems"},
];

function PanelBody({tab}: { tab: BottomPanelTab }) {
  const message =
    tab === "console"
      ? "Simulation and validation messages will stream here."
      : tab === "waveform"
        ? "Signal waveform trace — renders once the simulation clock is wired up."
        : "Circuit validation issues (unconnected pins, empty nets, ...) will list here.";

  return <div className="flex flex-1 items-center px-4 text-sm text-slate">{message}</div>;
}

export function BottomPanel() {
  const open = useUiStore((s) => s.bottomPanelOpen);
  const activeTab = useUiStore((s) => s.bottomPanelTab);
  const setTab = useUiStore((s) => s.setBottomPanelTab);
  const toggle = useUiStore((s) => s.toggleBottomPanel);

  return (
    <div className="flex h-full flex-col border-t border-border bg-surface-card">
      <div className="flex h-8 shrink-0 gap-1 px-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setTab(tab.id)}
            className={`rounded-md px-2 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide transition-colors ${
              open && activeTab === tab.id ? "bg-surface-2 text-ink" : "text-ink-soft hover:text-ink"
            }`}
          >
            {tab.label}
          </button>
        ))}
        <div className="flex-1"/>
        <button
          type="button"
          onClick={toggle}
          aria-label={open ? "Collapse panel" : "Expand panel"}
          className="rounded-md px-1.5 text-ink-soft transition-colors hover:text-ink"
        >
          {open ? "⌄" : "⌃"}
        </button>
      </div>

      {open && <PanelBody tab={activeTab}/>}
    </div>
  );
}
