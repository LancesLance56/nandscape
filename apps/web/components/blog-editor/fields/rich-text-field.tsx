"use client";

import { useCallback, useRef } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { LinkNode } from "@lexical/link";
import type { EditorState } from "lexical";
import type { ContentBlock, TextSpan } from "@/types/content-block";
import { editorStateToSpans, spansToEditorState } from "@/lib/blog-editor/rich-text/serialize";
import { SingleParagraphPlugin, PlainTextPastePlugin } from "@/components/blog-editor/fields/rich-text-plugins";
import { FormatToolbarPlugin } from "@/components/blog-editor/fields/rich-text-toolbar";
import { SlashCommandPlugin } from "@/components/blog-editor/fields/slash-command-plugin";

// Matches rich-text.tsx's applyMarks() classes exactly, so the editor's
// contentEditable looks like the published page while you type.
const theme = {
  text: {
    bold: "font-bold",
    italic: "italic",
    code: "rounded-md bg-surface-2 px-1.5 py-0.5 text-[0.9em] text-copper-dark",
  },
  link: "font-medium text-copper underline decoration-copper/40 underline-offset-2 hover:text-copper-dark",
};

function onError(error: Error) {
  console.error("[rich-text-field]", error);
}

const CHANGE_DEBOUNCE_MS = 150;

export function RichTextField({
  content,
  onChange,
  placeholder = "Paragraph text… (try \"/\" for block types)",
  onSlashCommand,
}: {
  content: TextSpan[];
  onChange: (spans: TextSpan[]) => void;
  placeholder?: string;
  /** Omit to disable the slash-command menu entirely (e.g. if this field is ever reused outside a convertible block). */
  onSlashCommand?: (type: ContentBlock["type"]) => void;
}) {
  const debounceRef = useRef<number | null>(null);

  // Lexical owns its own live editing state after mount - this seeds it
  // ONCE, the same way <textarea defaultValue> only sets an initial value.
  // Re-feeding `content` into Lexical on every parent re-render would fight
  // the user's cursor position; onChange (below) is the only channel back
  // out.
  const initialConfigRef = useRef({
    namespace: "paragraph-block",
    theme,
    nodes: [LinkNode],
    onError,
    editorState: spansToEditorState(content),
  });

  const handleChange = useCallback(
    (editorState: EditorState) => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => onChange(editorStateToSpans(editorState)), CHANGE_DEBOUNCE_MS);
    },
    [onChange],
  );

  return (
    <LexicalComposer initialConfig={initialConfigRef.current}>
      <div className="relative">
        <FormatToolbarPlugin />
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              className="min-h-12 w-full rounded-lg border border-border-strong bg-surface-card px-3 py-2 text-sm text-ink outline-none focus:border-copper"
              aria-placeholder={placeholder}
              placeholder={
                <div className="pointer-events-none absolute left-3 top-2 text-sm text-slate">{placeholder}</div>
              }
            />
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <LinkPlugin />
        <SingleParagraphPlugin />
        <PlainTextPastePlugin />
        {onSlashCommand && <SlashCommandPlugin onSelect={onSlashCommand} />}
        <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
      </div>
    </LexicalComposer>
  );
}
