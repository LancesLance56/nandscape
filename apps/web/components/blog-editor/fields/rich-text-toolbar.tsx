"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  $getSelection,
  $isRangeSelection,
  BLUR_COMMAND,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  COMMAND_PRIORITY_LOW,
  type TextFormatType,
} from "lexical";
import { $patchStyleText } from "@lexical/selection";
import { $isLinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import { $findMatchingParent, mergeRegister } from "@lexical/utils";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { safeHref } from "@/lib/content/safe-href";

interface ToolbarPosition {
  top: number;
  left: number;
}

// Curated, on-brand swatches rather than an open color picker - the site's
// existing content only ever uses copper/green/coral as semantic accents,
// so an arbitrary color wheel would be a capability the design doesn't
// actually call for. Legacy content with any other color value still
// round-trips fine (see marksFromTextNode in serialize.ts) - this list only
// constrains what the toolbar can *write*, not what already exists.
const COLOR_SWATCHES: { label: string; value: string | null }[] = [
  { label: "Default", value: null },
  { label: "Copper", value: "var(--copper)" },
  { label: "Green", value: "var(--signal-green)" },
  { label: "Coral", value: "var(--signal-coral)" },
];

const FORMAT_BUTTONS: { format: TextFormatType; label: string }[] = [
  { format: "bold", label: "B" },
  { format: "italic", label: "I" },
  { format: "code", label: "</>" },
];

// SSR-safe portal mounting - same pattern circuit-embed.tsx already uses.
function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

export function FormatToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const mounted = useMounted();
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<ToolbarPosition | null>(null);
  const [activeFormats, setActiveFormats] = useState<Set<TextFormatType>>(new Set());
  const [isLink, setIsLink] = useState(false);
  const [linkInputOpen, setLinkInputOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [colorMenuOpen, setColorMenuOpen] = useState(false);

  const hideToolbar = useCallback(() => {
    setPosition(null);
    setLinkInputOpen(false);
    setColorMenuOpen(false);
  }, []);

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection) || selection.isCollapsed()) {
      hideToolbar();
      return;
    }

    const domSelection = window.getSelection();
    const range = domSelection && domSelection.rangeCount > 0 ? domSelection.getRangeAt(0) : null;
    const rect = range?.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      setPosition(null);
      return;
    }

    setPosition({ top: rect.top + window.scrollY - 44, left: rect.left + window.scrollX + rect.width / 2 });

    const formats = new Set<TextFormatType>();
    for (const { format } of FORMAT_BUTTONS) {
      if (selection.hasFormat(format)) formats.add(format);
    }
    setActiveFormats(formats);

    setIsLink($findMatchingParent(selection.anchor.getNode(), $isLinkNode) !== null);
  }, [hideToolbar]);

  useEffect(
    () =>
      mergeRegister(
        editor.registerUpdateListener(({ editorState }) => editorState.read(() => updateToolbar())),
        editor.registerCommand(
          SELECTION_CHANGE_COMMAND,
          () => {
            updateToolbar();
            return false;
          },
          COMMAND_PRIORITY_LOW,
        ),
        // Lexical intentionally keeps the last selection alive internally
        // after the editor blurs (so a toolbar button click, which never
        // steals focus, still has a selection to act on) - it does not fire
        // another SELECTION_CHANGE_COMMAND for it. Each rich-text field
        // mounts its own editor and its own copy of this toolbar, so
        // clicking into a *different* field leaves this one's stale
        // selection and stale toolbar sitting on screen with nothing to
        // show it's out of date; clicking it then edits the old text
        // instead of the newly highlighted one. Force-hide on blur so a
        // stale toolbar can't outlive the selection it was showing.
        editor.registerCommand(
          BLUR_COMMAND,
          (event) => {
            const next = event.relatedTarget;
            if (next instanceof Node && toolbarRef.current?.contains(next)) {
              // Focus moved into our own link input, not away from it.
              return false;
            }
            hideToolbar();
            return false;
          },
          COMMAND_PRIORITY_LOW,
        ),
      ),
    [editor, updateToolbar, hideToolbar],
  );

  // The toolbar floats just above the current selection, which means a fresh
  // drag-to-select nearby can start with the mouse right on top of it - the
  // mousedown lands on the toolbar instead of the text, so the selection
  // (and whatever format button gets clicked next) stays stuck on the old
  // highlight. Hiding on mousedown clears it out of the way before the drag
  // begins; updateToolbar() brings it back once the new selection settles.
  useEffect(
    () =>
      editor.registerRootListener((rootElement, prevRootElement) => {
        prevRootElement?.removeEventListener("mousedown", hideToolbar);
        rootElement?.addEventListener("mousedown", hideToolbar);
      }),
    [editor, hideToolbar],
  );

  if (!mounted || !position) return null;

  const toggleFormat = (format: TextFormatType) => editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);

  const applyColor = (value: string | null) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) $patchStyleText(selection, { color: value ?? "" });
    });
    setColorMenuOpen(false);
  };

  const submitLink = () => {
    const trimmed = linkValue.trim();
    if (trimmed === "") {
      setLinkInputOpen(false);
      return;
    }
    const href = safeHref(trimmed);
    if (href === "#") {
      // safeHref refused it (unsafe protocol or malformed) - leave the
      // input open rather than silently saving a dead "#" link.
      return;
    }
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, href);
    setLinkInputOpen(false);
  };

  const removeLink = () => editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);

  return createPortal(
    <div
      ref={toolbarRef}
      style={{ top: position.top, left: position.left, transform: "translateX(-50%)" }}
      className="absolute z-50 flex items-center gap-0.5 rounded-lg border border-border bg-surface-card p-1 shadow-lg"
    >
      {FORMAT_BUTTONS.map(({ format, label }) => (
        <button
          key={format}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => toggleFormat(format)}
          className={`rounded-md px-2 py-1 text-xs font-semibold transition-colors ${
            activeFormats.has(format) ? "bg-copper-bg text-copper-dark" : "text-ink-soft hover:bg-surface-2"
          }`}
        >
          {label}
        </button>
      ))}

      <span className="mx-0.5 h-4 w-px bg-border-strong" />

      <div className="relative">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setColorMenuOpen((o) => !o)}
          className="rounded-md px-2 py-1 text-xs font-semibold text-ink-soft hover:bg-surface-2"
        >
          Color
        </button>
        {colorMenuOpen && (
          <div className="absolute top-full left-0 z-10 mt-1 flex flex-col gap-0.5 rounded-lg border border-border bg-surface-card p-1 shadow-lg">
            {COLOR_SWATCHES.map((swatch) => (
              <button
                key={swatch.label}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyColor(swatch.value)}
                className="flex items-center gap-2 whitespace-nowrap rounded-md px-2 py-1 text-left text-xs text-ink hover:bg-surface-2"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full border border-border-strong"
                  style={{ backgroundColor: swatch.value ?? "transparent" }}
                />
                {swatch.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <span className="mx-0.5 h-4 w-px bg-border-strong" />

      {isLink ? (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={removeLink}
          className="rounded-md px-2 py-1 text-xs font-semibold text-signal-coral hover:bg-surface-2"
        >
          Unlink
        </button>
      ) : linkInputOpen ? (
        <div className="flex items-center gap-1">
          <input
            autoFocus
            value={linkValue}
            onChange={(e) => setLinkValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitLink();
              if (e.key === "Escape") setLinkInputOpen(false);
            }}
            placeholder="https://…"
            className="w-40 rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-ink outline-none focus:border-copper"
          />
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={submitLink}
            className="rounded-md px-2 py-1 text-xs font-semibold text-copper-dark hover:bg-surface-2"
          >
            Set
          </button>
        </div>
      ) : (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setLinkValue("");
            setLinkInputOpen(true);
          }}
          className="rounded-md px-2 py-1 text-xs font-semibold text-ink-soft hover:bg-surface-2"
        >
          Link
        </button>
      )}
    </div>,
    document.body,
  );
}
