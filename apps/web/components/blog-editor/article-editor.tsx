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
import { PreviewPane, PreviewHeader, PreviewBlockItem } from "@/components/blog-editor/preview-pane";
import { ViewModeToggle } from "@/components/blog-editor/view-mode-toggle";
import { Button } from "@/components/ui/button";
import { useBlogEditorShortcuts } from "@/hooks/use-blog-editor-shortcuts";
import { useBlogAutosave } from "@/hooks/use-blog-autosave";
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
  const canUndo = useHistoryStore((s) => s.canUndo());
  const canRedo = useHistoryStore((s) => s.canRedo());

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
        // One shared page scroll, like before. Alignment comes from putting
        // each block and its rendered preview in the same CSS grid row
        // (block-list.tsx), so the row is naturally sized to the taller of
        // the two - no independent scroll containers, no scroll-position
        // math to keep them in sync.
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
            <div />
            <PreviewHeader />
          </div>
          <BlockList renderCompanion={(block) => <PreviewBlockItem block={block} />} />
        </div>
      ) : (
        <div className="mx-auto w-full max-w-4xl">{viewMode === "edit" ? <BlockList /> : <PreviewPane />}</div>
      )}
    </div>
  );
}
