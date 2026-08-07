"use client";

import { useEffect, useRef, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useSimulationStore } from "@/store/simulation-store";
import { ToolbarButton } from "./toolbar-button";

const MIN_SPEED = 10;
const MAX_SPEED = 1000;

function GearIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="8" cy="8" r="2.1" />
      <path
        d="M8 2.4v1.3M8 12.3v1.3M13.6 8h-1.3M3.7 8H2.4M11.9 4.1l-.9.9M5 11l-.9.9M11.9 11.9l-.9-.9M5 5l-.9-.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SimulationSettingsMenu() {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ left: number; top: number } | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const speed = useSimulationStore((s) => s.speed);
  const setSpeed = useSimulationStore((s) => s.setSpeed);

  useLayoutEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      setCoords({ left: rect.left - 120, top: rect.bottom + 6 });
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={anchorRef} className="relative">
      <ToolbarButton icon={<GearIcon />} label="Simulation settings" active={open} onClick={() => setOpen((o) => !o)} />

      {open &&
        coords &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: "fixed", left: coords.left, top: coords.top, zIndex: 999 }}
            className="w-72 rounded-xl border border-border bg-surface-card p-4 shadow-[0_16px_40px_rgba(21,27,24,0.16)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.6)]"
          >
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-slate">
              Simulation settings
            </span>

            <label className="mt-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-ink-soft">Playback speed</span>
                <span className="font-mono text-xs text-ink">{speed}/s</span>
              </div>
              <input
                type="range"
                min={MIN_SPEED}
                max={MAX_SPEED}
                step={10}
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="accent-[var(--copper)]"
              />
              <span className="text-[11px] text-ink-soft">
                Simulated time units advanced per real second while running,  this scales every clock in the
                circuit together. To set an individual clock&apos;s own rate, select it and use its inspector panel.
              </span>
            </label>
          </div>,
          document.body,
        )}
    </div>
  );
}
