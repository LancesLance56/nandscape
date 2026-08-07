"use client";

import { useEffect } from "react";
import { $getSelection, $isRangeSelection, COMMAND_PRIORITY_EDITOR, KEY_ENTER_COMMAND, PASTE_COMMAND } from "lexical";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

/**
 * TextSpan[] has no concept of a line break or a second paragraph - it's a
 * flat list of spans belonging to ONE ParagraphBlock. Enter would otherwise
 * split into a second Lexical paragraph that editorStateToSpans (see
 * serialize.ts) can't represent and would silently drop. An author who
 * wants a new paragraph already has "+ Add block" for that - it's a
 * different block, not a line break inside this one.
 */
export function SingleParagraphPlugin() {
  const [editor] = useLexicalComposerContext();
  useEffect(
    () =>
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        (event) => {
          event?.preventDefault();
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
    [editor],
  );
  return null;
}

/**
 * Forces paste to plain text. Lexical's default paste handler reconstructs
 * full DOM structure (multiple paragraphs, lists, headings) from clipboard
 * HTML, which would violate the single-paragraph invariant above. Source
 * formatting is lost on paste - a known, deliberate limitation, not a bug.
 */
export function PlainTextPastePlugin() {
  const [editor] = useLexicalComposerContext();
  useEffect(
    () =>
      editor.registerCommand(
        PASTE_COMMAND,
        (event) => {
          const clipboardEvent = event as ClipboardEvent;
          const text = clipboardEvent.clipboardData?.getData("text/plain");
          if (text == null) return false;
          event.preventDefault();
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) selection.insertText(text);
          });
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
    [editor],
  );
  return null;
}
