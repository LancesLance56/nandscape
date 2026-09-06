"use client";

/**
 * Is the dark theme on, right now?
 *
 * `useTheme()` from next-themes cannot answer this during the first client
 * render - it reports undefined until a mount effect has run - so anything
 * built on it needs a `mounted` flag and flashes the light version first. The
 * class on `<html>` is already correct at that point, because next-themes sets
 * it in a blocking script before paint, so reading the class is both simpler
 * and earlier.
 *
 * `useSyncExternalStore` is the right shape for exactly this: a server
 * snapshot the SSR pass uses, a client snapshot read during render, and a
 * subscription for later changes. The same pattern the practice editor uses
 * for its indent preference, and for the same reason - no hydration mismatch,
 * and no setState in an effect.
 */

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

const getSnapshot = (): boolean => document.documentElement.classList.contains("dark");

// The server has no theme to read. Light is the site's default, and a reader
// on dark gets the correct colours on the first client render rather than
// after an effect.
const getServerSnapshot = (): boolean => false;

export function useIsDark(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
