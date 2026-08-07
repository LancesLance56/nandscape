"use client";

import { useEffect, useRef } from "react";
import { useBlogEditorStore } from "@/store/blog-editor-store";

const AUTOSAVE_DEBOUNCE_MS = 2000;

/**
 * Only autosaves existing documents (originalSlug !== null). A brand-new
 * post/tutorial page has no slug until the author explicitly saves once -
 * autosaving from empty would either silently no-op against the "slug
 * required" guard in blog-editor-store's save(), or, worse, start creating
 * documents from a blank draft the moment the author types a title.
 */
export function useBlogAutosave(): void {
  const timerRef = useRef<number | null>(null);
  const skipNextRef = useRef(true);
  const prevOriginalSlugRef = useRef<string | null>(null);

  const blocks = useBlogEditorStore((s) => s.blocks);
  const metadata = useBlogEditorStore((s) => s.metadata);
  const originalSlug = useBlogEditorStore((s) => s.originalSlug);
  const lastLoadedAt = useBlogEditorStore((s) => s.lastLoadedAt);

  // loadDocument() firing (a fresh mount, or switching documents) is a data
  // change too, but it isn't an edit - skip the change immediately following
  // it so autosave doesn't fire the instant a document finishes loading.
  useEffect(() => {
    skipNextRef.current = true;
  }, [lastLoadedAt]);

  useEffect(() => {
    // The manual first save on a new document flips originalSlug from null
    // to a real slug without the author having edited anything since - skip
    // that transition too, or this immediately re-PATCHes the content that
    // was just POSTed.
    const justCreated = prevOriginalSlugRef.current === null && originalSlug !== null;
    prevOriginalSlugRef.current = originalSlug;

    if (skipNextRef.current || justCreated) {
      skipNextRef.current = false;
      return;
    }
    if (!originalSlug) return;

    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      void useBlogEditorStore.getState().save();
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks, metadata, originalSlug]);
}
