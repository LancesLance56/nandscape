"use client";

import {useUiStore} from "@/store/ui-store";
import {GatePalette} from "@/components/editor/sidebar/gate-palette";

export function BottomPanel() {
  const open = useUiStore((s) => s.bottomPanelOpen);

  return (
    <div className="relative h-full border-t border-border bg-surface-card">
      {open && (
        <div className="h-full overflow-hidden">
          <GatePalette/>
        </div>
      )}
    </div>
  );
}