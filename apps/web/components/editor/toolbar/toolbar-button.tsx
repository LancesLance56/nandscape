"use client";

import type { ReactNode } from "react";

interface ToolbarButtonProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  shortcut?: string;
}

export function ToolbarButton({
  icon,
  label,
  onClick,
  active = false,
  disabled = false,
  shortcut,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={shortcut ? `${label} (${shortcut})` : label}
      className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 ${
        active
          ? "border-copper/40 bg-copper-bg text-copper-dark"
          : "border-transparent text-ink-soft hover:border-border-strong hover:bg-surface-2 hover:text-ink"
      }`}
    >
      {icon}
    </button>
  );
}
