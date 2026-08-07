"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  $getSelection,
  $isRangeSelection,
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
  const [position, setPosition] = useState<ToolbarPosition | null>(null);
  const [activeFormats, setActiveFormats] = useState<Set<TextFormatType>>(new Set());
  const [isLink, setIsLink] = useState(false);
  const [linkInputOpen, setLinkInputOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [colorMenuOpen, setColorMenuOpen] = useState(false);

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection) || selection.isCollapsed()) {
      setPosition(null);
      setLinkInputOpen(false);
      setColorMenuOpen(false);
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
  }, []);

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
      ),
    [editor, updateToolbar],
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
      style={{ top: position.top, left: position.left, transform: "translateX(-50%)" }}
      className="fixed z-50 flex items-center gap-0.5 rounded-lg border border-border bg-surface-card p-1 shadow-lg"
    >
      {FORMAT_BUTTONS.map(({ format, label }) => (
        <button
          key={format}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => toggleFormat(format)}
          className={`rounded-md px-2 py-1 font-mono text-xs font-semibold transition-colors ${
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
          className="rounded-md px-2 py-1 font-mono text-xs font-semibold text-ink-soft hover:bg-surface-2"
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
          className="rounded-md px-2 py-1 font-mono text-xs font-semibold text-signal-coral hover:bg-surface-2"
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
            className="w-40 rounded-md border border-border-strong bg-surface px-2 py-1 font-mono text-xs text-ink outline-none focus:border-copper"
          />
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={submitLink}
            className="rounded-md px-2 py-1 font-mono text-xs font-semibold text-copper-dark hover:bg-surface-2"
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
          className="rounded-md px-2 py-1 font-mono text-xs font-semibold text-ink-soft hover:bg-surface-2"
        >
          Link
        </button>
      )}
    </div>,
    document.body,
  );
}
