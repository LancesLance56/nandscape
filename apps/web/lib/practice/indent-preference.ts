"use client";

import { useSyncExternalStore } from "react";

/**
 * How many spaces one indent level is, remembered per browser.
 *
 * Four by default. Two is CodeMirror's own default and is wrong for this site:
 * Python is the first language in the picker and PEP 8 is four, the C++ and
 * JavaScript starters are written at four, and a learner pressing Tab should
 * land where the surrounding code already sits.
 *
 * Read through `useSyncExternalStore` rather than an effect that calls
 * setState. localStorage is exactly the "external mutable source" that API
 * exists for: `getServerSnapshot` lets the server render the default while the
 * client renders the stored value, with no hydration mismatch and no
 * cascading render during commit.
 */

const STORAGE_KEY = "nandscape:practice-indent";
const DEFAULT_INDENT = 4;

export const INDENT_OPTIONS = [2, 4, 8] as const;

let listeners: (() => void)[] = [];

/**
 * The value chosen this session, which takes precedence over what storage
 * reports. Without it a browser that refuses writes (private mode, site data
 * blocked) would fire the listeners and then read back the old value, so the
 * picker would snap straight back and the setting would appear broken.
 */
let override: number | null = null;

function subscribe(onChange: () => void): () => void {
  listeners.push(onChange);
  return () => {
    listeners = listeners.filter((listener) => listener !== onChange);
  };
}

function getSnapshot(): number {
  if (override !== null) return override;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return DEFAULT_INDENT;
    const parsed = Number.parseInt(raw, 10);
    // A stored value outside the offered set (hand-edited, or left over from a
    // future version) falls back rather than putting the picker in a state it
    // cannot display.
    return (INDENT_OPTIONS as readonly number[]).includes(parsed) ? parsed : DEFAULT_INDENT;
  } catch {
    // Private browsing, or storage disabled.
    return DEFAULT_INDENT;
  }
}

function getServerSnapshot(): number {
  return DEFAULT_INDENT;
}

export function useIndentSize(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function setIndentSize(size: number): void {
  override = size;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(size));
  } catch {
    // Not worth surfacing: `override` already carries the change for this
    // visit, it just will not outlive the tab.
  }
  for (const listener of [...listeners]) listener();
}

/** The literal string one indent level inserts. */
export function indentString(size: number): string {
  return " ".repeat(size);
}
