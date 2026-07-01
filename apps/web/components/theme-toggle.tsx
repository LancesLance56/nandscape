"use client";

import { useTheme } from "@/components/theme-provider";
import { MoonIcon, SunIcon } from "@/components/icons";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggleTheme}
      className="relative flex h-8 w-14 items-center rounded-full border border-border-strong bg-surface-2 p-1 transition-colors"
    >
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full bg-surface-card text-ink-soft shadow-sm transition-transform duration-200 ${
          isDark ? "translate-x-6" : "translate-x-0"
        }`}
      >
        {isDark ? (
          <MoonIcon className="h-3.5 w-3.5" />
        ) : (
          <SunIcon className="h-3.5 w-3.5" />
        )}
      </span>
    </button>
  );
}