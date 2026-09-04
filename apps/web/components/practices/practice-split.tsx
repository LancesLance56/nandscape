"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";

/**
 * The draggable divider between the problem statement and the editor.
 *
 * The split position is held in a CSS custom property and written straight to
 * the DOM through a ref, never in React state. That is deliberate: a drag fires
 * pointermove at screen refresh rate, and routing each one through setState
 * would re-render the whole right-hand pane - including CodeMirror - dozens of
 * times a second. Writing one custom property instead lets the browser do the
 * layout and leaves the editor untouched.
 *
 * Only active from `lg` up. Below that the panes stack and there is nothing to
 * resize, so the handle is not rendered at all rather than merely hidden.
 */

const STORAGE_KEY = "nandscape:practice-split";
const DEFAULT_PERCENT = 50;
const MIN_PERCENT = 25;
const MAX_PERCENT = 75;
/** Arrow-key step, in percentage points. */
const KEY_STEP = 2;

function clamp(percent: number): number {
  return Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, percent));
}

interface PracticeSplitProps {
  left: ReactNode;
  right: ReactNode;
  /** Height of the fixed nav above this, so the split can fill the rest. */
  topOffsetRem: number;
}

export function PracticeSplit({ left, right, topOffsetRem }: PracticeSplitProps) {
  const container = useRef<HTMLDivElement | null>(null);
  const handle = useRef<HTMLDivElement | null>(null);
  const percent = useRef(DEFAULT_PERCENT);
  /** Set while a drag is in flight, so unmount can tear it down. */
  const teardown = useRef<(() => void) | null>(null);

  useEffect(() => () => teardown.current?.(), []);

  const apply = useCallback((next: number) => {
    percent.current = next;
    container.current?.style.setProperty("--practice-split", `${next}%`);
    handle.current?.setAttribute("aria-valuenow", String(Math.round(next)));
  }, []);

  /**
   * Restore the reader's last split.
   *
   * Applied through the ref rather than as initial state because localStorage
   * does not exist while this renders on the server: seeding state from it
   * would be a hydration mismatch, and the value is presentational enough that
   * a one-frame correction is invisible.
   */
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === null) return;
      const parsed = Number.parseFloat(stored);
      if (Number.isFinite(parsed)) apply(clamp(parsed));
    } catch {
      // Private browsing, or storage disabled. The default split is fine.
    }
  }, [apply]);

  const persist = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(percent.current));
    } catch {
      // Not worth surfacing - the split still works for this visit.
    }
  }, []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const node = container.current;
      if (!node) return;

      // Read out of the synthetic event *now*, into a local. React resets
      // `currentTarget` to null once this handler returns, so a closure that
      // reaches for it later - as the pointerup handler below does - would find
      // null rather than the element.
      const grip = event.currentTarget;

      // Pointer capture keeps events coming to the handle even when the cursor
      // outruns it, which it always does on a fast drag.
      grip.setPointerCapture(event.pointerId);

      const bounds = node.getBoundingClientRect();

      const move = (moveEvent: PointerEvent) => {
        const ratio = ((moveEvent.clientX - bounds.left) / bounds.width) * 100;
        apply(clamp(ratio));
      };

      // Everything the drag installed, undone in one place so that unmounting
      // mid-drag can run it too - otherwise navigating away while holding the
      // handle leaves listeners attached and the whole document stuck at
      // `user-select: none`.
      const detach = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", end);
        window.removeEventListener("pointercancel", end);
        // Restored here rather than by toggling a class so it is undone even
        // when the pointer is released outside the window.
        document.body.style.removeProperty("user-select");
        document.body.style.removeProperty("cursor");
        teardown.current = null;
      };

      function end(endEvent: PointerEvent) {
        // The browser releases capture implicitly on pointerup, so releasing an
        // id it no longer holds throws InvalidPointerId. Ask first.
        if (grip.hasPointerCapture(endEvent.pointerId)) {
          grip.releasePointerCapture(endEvent.pointerId);
        }
        detach();
        persist();
      }

      teardown.current = detach;

      // Without this, dragging across the statement selects its text.
      document.body.style.setProperty("user-select", "none");
      document.body.style.setProperty("cursor", "col-resize");

      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", end);
      // A cancelled pointer (an interrupted touch, a system gesture) never
      // fires pointerup; without this the listeners and the frozen selection
      // would outlive the drag.
      window.addEventListener("pointercancel", end);
    },
    [apply, persist],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const step =
        event.key === "ArrowLeft" ? -KEY_STEP : event.key === "ArrowRight" ? KEY_STEP : 0;
      if (step === 0) {
        if (event.key !== "Home" && event.key !== "End") return;
        event.preventDefault();
        apply(event.key === "Home" ? MIN_PERCENT : MAX_PERCENT);
        persist();
        return;
      }
      event.preventDefault();
      apply(clamp(percent.current + step));
      persist();
    },
    [apply, persist],
  );

  const reset = useCallback(() => {
    apply(DEFAULT_PERCENT);
    persist();
  }, [apply, persist]);

  return (
    <div
      ref={container}
      style={
        {
          "--practice-split": `${DEFAULT_PERCENT}%`,
          "--practice-top": `${topOffsetRem}rem`,
        } as React.CSSProperties
      }
      className="lg:flex lg:h-[calc(100dvh-var(--practice-top))] lg:overflow-hidden"
    >
      <div className="min-w-0 lg:w-[var(--practice-split)] lg:shrink-0 lg:overflow-y-auto">
        {left}
      </div>

      {/*
        A real separator, not a decorative line: it is focusable and reports its
        position, so the split can be moved with the keyboard by anyone who
        cannot drag. Double-click restores the even split.
      */}
      <div
        ref={handle}
        role="separator"
        tabIndex={0}
        aria-label="Resize problem and editor panes"
        aria-orientation="vertical"
        aria-valuemin={MIN_PERCENT}
        aria-valuemax={MAX_PERCENT}
        aria-valuenow={DEFAULT_PERCENT}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
        onDoubleClick={reset}
        className="group hidden shrink-0 cursor-col-resize items-center justify-center border-x border-border bg-surface-2 transition-colors hover:bg-copper-bg focus-visible:bg-copper-bg focus-visible:outline-none lg:flex lg:w-1.5"
      >
        {/* A grip that only appears on hover or focus - visible enough to find,
            quiet enough not to draw the eye while reading. */}
        <span className="h-8 w-0.5 rounded-full bg-transparent transition-colors group-hover:bg-copper group-focus-visible:bg-copper" />
      </div>

      <div className="min-w-0 lg:h-full lg:flex-1">{right}</div>
    </div>
  );
}
