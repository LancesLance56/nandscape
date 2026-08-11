"use client";

import { usePreferencesStore } from "@/store/preferences-store";
import { ToolbarButton } from "./toolbar-button";

function LabelIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 4.5a1 1 0 0 1 1-1h6.1a1 1 0 0 1 .75.34l3.9 4.4a1 1 0 0 1 0 1.32l-3.9 4.4a1 1 0 0 1-.75.34H3a1 1 0 0 1-1-1V4.5Z" strokeLinejoin="round" />
      <circle cx="6" cy="8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Previously lived inside ShareDialog as a settings toggle - it's a
 *  display preference unrelated to sharing/saving, so it's a plain toolbar
 *  toggle now, matching the sidebar/inspector toggle buttons right next to it. */
export function GateLabelsToggle() {
  const showGateLabels = usePreferencesStore((s) => s.showGateLabels);
  const setShowGateLabels = usePreferencesStore((s) => s.setShowGateLabels);

  return (
    <ToolbarButton
      icon={<LabelIcon />}
      label="Show gate labels"
      active={showGateLabels}
      onClick={() => setShowGateLabels(!showGateLabels)}
    />
  );
}
