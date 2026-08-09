"use client";

import { useEffect } from "react";
import { useBlogEditorStore } from "@/store/blog-editor-store";
import { useBlogEditorUiStore } from "@/store/blog-editor-ui-store";
import { useHistoryStore } from "@/store/history-store";
import { emptyMetadata, type DocumentKind, type DocumentMetadata } from "@/lib/blog-editor/types";
import type { ContentBlock } from "@/types/content-block";
import type { TutorialSection } from "@/types/tutorial";
import { MetadataPanel } from "@/components/blog-editor/metadata-panel";
import { BlockList } from "@/components/blog-editor/block-list";
import { PreviewPane } from "@/components/blog-editor/preview-pane";
import { ViewModeToggle } from "@/components/blog-editor/view-mode-toggle";
import { Button } from "@/components/ui/button";
import { useBlogEditorShortcuts } from "@/hooks/use-blog-editor-shortcuts";
import { useBlogAutosave } from "@/hooks/use-blog-autosave";
import { useSyncedScroll } from "@/hooks/use-synced-scroll";
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb";

export interface ArticleEditorProps {
  documentKind: DocumentKind;
  /** null = new, unsaved document. Non-null = the slug this document was loaded from. */
  originalSlug: string | null;
  initialMetadata?: DocumentMetadata;
  initialBlocks?: ContentBlock[];
  /** Tutorial-only. Populates MetadataPanel's section picker; ignored for posts. */
  sections?: TutorialSection[];
}

export function ArticleEditor({
  documentKind,
  originalSlug,
  initialMetadata,
  initialBlocks,
  sections,
}: ArticleEditorProps) {
  const loadDocument = useBlogEditorStore((s) => s.loadDocument);
  const save = useBlogEditorStore((s) => s.save);
  const saveStatus = useBlogEditorStore((s) => s.saveStatus);
  const saveError = useBlogEditorStore((s) => s.saveError);
  const viewMode = useBlogEditorUiStore((s) => s.viewMode);
  const syncScroll = useBlogEditorUiStore((s) => s.syncScroll);
  const setSyncScroll = useBlogEditorUiStore((s) => s.setSyncScroll);
  const canUndo = useHistoryStore((s) => s.canUndo());
  const canRedo = useHistoryStore((s) => s.canRedo());
  const { leftRef, rightRef } = useSyncedScroll(viewMode === "split" && syncScroll);

  useEffect(() => {
    loadDocument(documentKind, originalSlug, initialMetadata ?? emptyMetadata(), initialBlocks ?? []);
    // Scoped to document identity on purpose, not every prop change - this
    // mirrors editor-store.ts's loadGraph: switching documents resets the
    // store, editing within a document doesn't re-trigger it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentKind, originalSlug]);

  useBlogEditorShortcuts();
  useBlogAutosave();

  const listHref = documentKind === "post" ? "/admin/blog" : "/admin/tutorials";
  const listLabel = documentKind === "post" ? "Posts" : "Tutorial pages";

  return (
    <div className="mx-auto flex max-w-400 flex-col gap-6 px-4 pb-24 pt-8">
      <AdminBreadcrumb
        trail={[{ label: listLabel, href: listHref }, { label: originalSlug ? "Edit" : "New" }]}
      />
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-bold text-ink">
          {originalSlug ? "Edit" : "New"} {documentKind === "post" ? "post" : "tutorial page"}
        </h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              disabled={!canUndo}
              onClick={() => useHistoryStore.getState().undo()}
              title="Undo (⌘Z)"
            >
              Undo
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={!canRedo}
              onClick={() => useHistoryStore.getState().redo()}
              title="Redo (⌘⇧Z)"
            >
              Redo
            </Button>
          </div>
          <ViewModeToggle />
          {viewMode === "split" && (
            <label className="flex items-center gap-1.5 font-mono text-xs text-slate">
              <input
                type="checkbox"
                checked={syncScroll}
                onChange={(e) => setSyncScroll(e.target.checked)}
                className="accent-copper"
              />
              Sync scroll
            </label>
          )}
          <span className="font-mono text-xs text-slate">
            {saveStatus === "saving" && "Saving…"}
            {saveStatus === "saved" && "Saved"}
            {saveStatus === "error" && saveError}
          </span>
          <Button onClick={() => void save()} disabled={saveStatus === "saving"}>
            Save
          </Button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-4xl">
        <MetadataPanel sections={sections ?? []} />
      </div>

      {viewMode === "split" ? (
        // Each pane scrolls independently (sticky + its own overflow) rather
        // than as one long page - otherwise the two columns just drift apart
        // as soon as editor and rendered block heights diverge, which is the
        // whole reason scrolling this view was annoying. useSyncedScroll
        // additionally keeps them locked to the same block when enabled.
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          {/* pt-8 gives the first block's hover toolbar (block-card.tsx
              floats it 32px above the block) room to render without being
              clipped by overflow-y-auto. */}
          <div ref={leftRef} className="sticky top-8 max-h-[calc(100vh-6rem)] overflow-y-auto pr-1 pt-8">
            <BlockList />
          </div>
          <div ref={rightRef} className="sticky top-8 max-h-[calc(100vh-6rem)] overflow-y-auto pr-1 pt-8">
            <PreviewPane />
          </div>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-4xl">{viewMode === "edit" ? <BlockList /> : <PreviewPane />}</div>
      )}
    </div>
  );
}
