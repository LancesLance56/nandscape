"use client";

import { useEffect, useRef } from "react";

// Position of `el`'s top edge relative to `container`'s scrollable content,
// in the same coordinate space as `container.scrollTop`. Deliberately not
// `el.offsetTop`, which is relative to the nearest *positioned* ancestor -
// fragile here since either pane's DOM (dnd-kit wrappers, renderer markup)
// could introduce one between the scroll container and a block without
// anyone noticing. getBoundingClientRect() differences don't depend on the
// positioning context at all.
function scrollOffsetOf(container: HTMLElement, el: HTMLElement): number {
  return el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
}

/**
 * Keeps two scrollable panes roughly aligned by block: scrolling one finds
 * the block sitting at its top edge (matched by a shared `data-block-id`)
 * and scrolls the other pane to put the same block at the same offset.
 *
 * Block heights differ between an editor row and its rendered preview (an
 * image block is never the same height as its editor form), so this is an
 * approximation - "same block, same distance scrolled into it" - not a
 * pixel-exact mapping. Good enough to stop the two panes from drifting
 * apart over a long document, which is the actual complaint.
 */
export function useSyncedScroll(enabled: boolean) {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  // Set while we're programmatically scrolling the *other* pane, so its
  // resulting scroll event doesn't bounce right back and fight the one that
  // triggered it.
  const syncingRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    const left = leftRef.current;
    const right = rightRef.current;
    if (!left || !right) return;

    const sync = (source: HTMLElement, target: HTMLElement) => {
      if (syncingRef.current) return;

      const blocks = Array.from(source.querySelectorAll<HTMLElement>("[data-block-id]"));
      if (blocks.length === 0) return;

      let anchor = blocks[0];
      let anchorOffset = scrollOffsetOf(source, anchor);
      for (const el of blocks) {
        const offset = scrollOffsetOf(source, el);
        if (offset > source.scrollTop) break;
        anchor = el;
        anchorOffset = offset;
      }

      const id = anchor.dataset.blockId;
      const targetBlock = id && target.querySelector<HTMLElement>(`[data-block-id="${CSS.escape(id)}"]`);
      if (!targetBlock) return;

      const withinBlock = source.scrollTop - anchorOffset;
      const maxScroll = Math.max(target.scrollHeight - target.clientHeight, 0);
      const nextScrollTop = Math.min(Math.max(scrollOffsetOf(target, targetBlock) + withinBlock, 0), maxScroll);

      syncingRef.current = true;
      target.scrollTop = nextScrollTop;
      requestAnimationFrame(() => {
        syncingRef.current = false;
      });
    };

    const onLeftScroll = () => sync(left, right);
    const onRightScroll = () => sync(right, left);

    left.addEventListener("scroll", onLeftScroll, { passive: true });
    right.addEventListener("scroll", onRightScroll, { passive: true });
    return () => {
      left.removeEventListener("scroll", onLeftScroll);
      right.removeEventListener("scroll", onRightScroll);
    };
  }, [enabled]);

  return { leftRef, rightRef };
}
