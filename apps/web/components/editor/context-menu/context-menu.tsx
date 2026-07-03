"use client";

import { useEffect, useRef } from "react";
import { useContextMenuState, useCloseContextMenu } from "./use-context-menu";
import { buildContextMenuItems } from "./context-menu-registry";
import { useEditorStore } from "@/store/editor-store";
import { useCommandDispatch } from "@/hooks/use-command";
import { commandRegistry } from "@/lib/commands/registry";

export function ContextMenu() {
  const menu = useContextMenuState();
  const close = useCloseContextMenu();
  const dispatch = useCommandDispatch();
  const nodes = useEditorStore((s) => s.nodes);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;

    function handlePointerDown(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) close();
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menu, close]);

  if (!menu) return null;

  const node = menu.targetId ? (nodes.find((n) => n.id === menu.targetId) ?? null) : null;
  const items = buildContextMenuItems({ targetId: menu.targetId, node });

  return (
    <div
      ref={ref}
      style={{ left: menu.x, top: menu.y }}
      className="fixed z-50 w-52 rounded-xl border border-border bg-surface-card py-1.5 shadow-[0_16px_40px_rgba(21,27,24,0.16)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.6)]"
    >
      {items.map((item) => (
        <button
          key={item.commandId}
          type="button"
          onClick={() => {
            const command = commandRegistry.get(item.commandId);
            if (command) dispatch(command);
            close();
          }}
          className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm transition-colors hover:bg-surface-2 ${
            item.destructive ? "text-signal-coral" : "text-ink"
          }`}
        >
          {item.label}
          {item.shortcut && <span className="font-mono text-[11px] text-slate">{item.shortcut}</span>}
        </button>
      ))}
    </div>
  );
}
