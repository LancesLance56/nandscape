"use client";

/**
 * The application shell.
 *
 *   dock │ contextual bar                        │ inspector
 *        ├───────────────────────────────────────│
 *        │ canvas                                │
 *        ├───────────────────────────────────────│
 *        │ pages · zoom                          │
 *
 * Four surfaces, four jobs, and no two of them answer the same question. The
 * dock says what the pointer does. The bar says what to do to the selection,
 * and shows nothing that does not apply to it. The inspector says what the
 * selection *is* - including where new shapes come from. The strip is the
 * document's own state.
 *
 * The arrangement is load-bearing rather than decorative: with the library on
 * the right, the canvas begins 56px from the window edge instead of 320px, and
 * a drawing that is wider than it is tall - which every flowchart is - gets the
 * width back.
 */

import { useEffect, useRef, useState } from "react";

import { emptyDoc, type Doc } from "@/lib/flowchart-editor/model";
import { isDoc } from "@/lib/flowchart-editor/export";
import { useEditor } from "@/lib/flowchart-editor/store";
import { Canvas } from "./canvas";
import { Dock } from "./dock";
import { TopBar } from "./topbar";
import { Inspector } from "./inspector";
import { BottomBar } from "./bottom-bar";
import { HelpDrawer } from "./help";

const DRAFT_KEY = "nandscape:flowchart-editor-doc";
const SAVE_DEBOUNCE_MS = 600;

export interface FlowchartEditorProps {
  /** Open with this drawing instead of the stored draft. */
  initial?: Doc;
  /** Called whenever the drawing settles, for surfaces that own the saving. */
  onChange?: (doc: Doc) => void;
  /**
   * Keep a draft in localStorage.
   *
   * On for the standalone tool, where there is no account and no save button
   * and a refresh used to cost everything. Off when the editor is embedded in
   * something that already persists - a blog post, a stored diagram - because
   * two drafts of the same drawing is one too many.
   */
  autosave?: boolean;
  /** Fill the window, or sit inside a page that owns the scroll. */
  variant?: "standalone" | "embedded";
  height?: number;
}

export function FlowchartEditor({
  initial,
  onChange,
  autosave = true,
  variant = "standalone",
  height = 560,
}: FlowchartEditorProps) {
  const [help, setHelp] = useState(false);
  useDocumentSource({ initial, onChange, autosave });

  return (
    <div
      className="fe-root flex flex-col overflow-hidden bg-fe-shell text-fe-ink"
      style={
        variant === "standalone"
          ? { height: "100dvh" }
          : { height, borderRadius: 12, border: "1px solid var(--fe-line)" }
      }
    >
      <div className="flex min-h-0 flex-1">
        <Dock onHelp={() => setHelp(true)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <Canvas />
          <BottomBar />
        </div>
        <Inspector />
      </div>
      {help && <HelpDrawer onClose={() => setHelp(false)} />}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Document source
 * ---------------------------------------------------------------------- */

/**
 * Where the drawing comes from and where it goes.
 *
 * Restoring happens in an effect rather than in the store's initial state so
 * that the server and the first client render agree; reading localStorage
 * during render would hydrate a different tree than the server sent.
 */
function useDocumentSource({
  initial,
  onChange,
  autosave,
}: {
  initial?: Doc;
  onChange?: (doc: Doc) => void;
  autosave: boolean;
}) {
  const doc = useEditor((s) => s.doc);
  const revision = useEditor((s) => s.revision);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (initial) {
      useEditor.setState({ doc: initial, pageIndex: 0, past: [], future: [], selection: [] });
      return;
    }
    if (!autosave) {
      useEditor.setState({ doc: emptyDoc(), pageIndex: 0, past: [], future: [], selection: [] });
      return;
    }
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (isDoc(parsed)) useEditor.setState({ doc: parsed, pageIndex: 0 });
    } catch {
      // A corrupt draft is not worth surfacing; a blank page is a fine thing
      // to open with.
    }
  }, [initial, autosave]);

  useEffect(() => {
    if (!started.current || revision === 0) return;
    const id = window.setTimeout(() => {
      onChange?.(doc);
      if (!autosave) return;
      try {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(doc));
      } catch {
        // Quota, or a browser with storage switched off. Nothing to do, and
        // nothing worth interrupting the drawing to say.
      }
    }, SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
    // `onChange` is rebuilt on every render of the parent, so depending on it
    // would publish the drawing in a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, revision, autosave]);
}
