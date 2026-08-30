"use client";

import { useSyncExternalStore } from "react";

/**
 * The browser's own origin, without breaking hydration.
 *
 * Embed snippets have to carry an absolute URL, and the only honest source of
 * it is the host the reader is actually on: localhost while developing, the
 * real domain in production. Reading `window.location.origin` directly is what
 * you reach for, and it is wrong. The server has no `window`, so the usual
 * `typeof window === "undefined" ? FALLBACK : window.location.origin` renders
 * one string into the HTML and a different one on the client, and React throws
 * a hydration mismatch on the snippet text.
 *
 * `useSyncExternalStore` exists for exactly this. Its third argument is the
 * server snapshot, so React renders `fallback` on the server *and* through
 * hydration, then re-renders with the real origin once mounted. The two passes
 * agree, so there is no mismatch, and no `useState` + `useEffect` dance that
 * would trip the repo's set-state-in-effect rule.
 */

/** Never changes within a document, so the subscribe callback is a no-op. */
const subscribe = () => () => {};

/** Matches production, where the fallback and the real origin are the same
 *  string and nothing visibly swaps. */
const CANONICAL_ORIGIN = "https://nandscape.dev";

export function useOrigin(fallback: string = CANONICAL_ORIGIN): string {
  return useSyncExternalStore(
    subscribe,
    () => window.location.origin,
    () => fallback,
  );
}
