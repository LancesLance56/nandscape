"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { $getRoot, $createParagraphNode, COMMAND_PRIORITY_EDITOR, KEY_ESCAPE_COMMAND, type LexicalEditor } from "lexical";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { creatableBlockTypes } from "@/lib/blog-editor/block-registry";
import type { ContentBlock } from "@/types/content-block";

interface MenuPosition {
  top: number;
  left: number;
}

// SSR-safe portal mounting - same pattern rich-text-toolbar.tsx uses.
function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

function resetToEmptyParagraph(editor: LexicalEditor) {
  editor.update(() => {
    const root = $getRoot();
    root.clear();
    root.append($createParagraphNode());
  });
}

/**
 * Only meaningful inside RichTextField, which SingleParagraphPlugin (see
 * rich-text-plugins.tsx) guarantees holds exactly one paragraph - so "the
 * entire editor's text is '/'" and "the user just typed '/' into an empty
 * paragraph" are the same condition, checkable via registerTextContentListener
 * without tracking cursor position separately.
 */
export function SlashCommandPlugin({ onSelect }: { onSelect: (type: ContentBlock["type"]) => void }) {
  const [editor] = useLexicalComposerContext();
  const mounted = useMounted();
  const [position, setPosition] = useState<MenuPosition | null>(null);

  useEffect(
    () =>
      editor.registerTextContentListener((text) => {
        if (text !== "/") {
          setPosition(null);
          return;
        }
        const domSelection = window.getSelection();
        const range = domSelection && domSelection.rangeCount > 0 ? domSelection.getRangeAt(0) : null;
        const rect = range?.getBoundingClientRect();
        if (!rect) return;
        setPosition({ top: rect.bottom + window.scrollY + 6, left: rect.left + window.scrollX });
      }),
    [editor],
  );

  const close = useCallback(() => setPosition(null), []);

  useEffect(() => {
    if (!position) return;
    return editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      () => {
        resetToEmptyParagraph(editor);
        close();
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [editor, position, close]);

  if (!mounted || !position) return null;

  const choose = (type: ContentBlock["type"]) => {
    resetToEmptyParagraph(editor);
    close();
    onSelect(type);
  };

  return createPortal(
    <div
      style={{ top: position.top, left: position.left }}
      className="fixed z-50 flex w-56 flex-col gap-0.5 rounded-lg border border-border bg-surface-card p-1.5 shadow-lg"
    >
      {creatableBlockTypes.map((definition) => (
        <button
          key={definition.type}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => choose(definition.type)}
          className="rounded-md px-2.5 py-1.5 text-left text-sm text-ink hover:bg-surface-2"
        >
          {definition.label}
        </button>
      ))}
    </div>,
    document.body,
  );
}
