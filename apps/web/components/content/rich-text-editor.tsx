"use client";

/**
 * The site's rich-text editor.
 *
 * One component behind every authored Markdown field: a discussion body, a
 * spoiler solution, a coding problem's statement. It is a Tiptap editor, but
 * the value it reads and writes is still a Markdown string, because Markdown
 * is what the database columns hold, what `seed/*.json` ships, what
 * `seed/export.mjs` pulls back and what `MarkdownProse` renders. Nothing about
 * the storage format changed; what changed is that an author now sees a
 * heading as a heading while typing it.
 *
 * The two things that make that safe:
 *
 *  - The schema is exactly GFM (`lib/rich-text/extensions.ts`), so there is no
 *    formatting the editor can produce that the serialiser then throws away.
 *  - The Markdown tab is always there. A WYSIWYG surface that hides the source
 *    is a surface you cannot repair when it gets the source wrong, and the
 *    people writing problem statements write Markdown fluently. Both tabs edit
 *    the same string, so switching is free and nothing is a conversion.
 *
 * Styling lives in `rich-text-editor.css` rather than on the nodes, because
 * the content is a contenteditable rather than React-rendered elements - there
 * is no component map to hang Tailwind classes off. Those rules mirror the
 * published look closely enough to be worth the duplication: an author writing
 * a statement should be looking at the statement.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import {
  Bold,
  Code,
  Code2,
  Heading2,
  Heading3,
  Italic,
  Link2,
  Link2Off,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Table,
  Undo2,
} from "lucide-react";

import { cn } from "@/lib/cn";
import { richTextExtensions } from "@/lib/rich-text/extensions";
import "./rich-text-editor.css";

type Mode = "rich" | "markdown";

export interface RichTextEditorProps {
  /** Markdown. The editor never hands back anything else. */
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  /** Roughly how many lines of writing room the surface opens with. */
  rows?: number;
  autoFocus?: boolean;
  /** A reply needs fewer controls than a problem statement. */
  toolbar?: "compact" | "full";
  /** Shown at the right of the tab strip - a word count, a filename, a hint. */
  aside?: ReactNode;
  className?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  rows = 8,
  autoFocus = false,
  toolbar = "compact",
  aside,
  className,
}: RichTextEditorProps) {
  const [mode, setMode] = useState<Mode>("rich");

  /**
   * The last Markdown this component was in agreement with the parent about.
   *
   * Without it, every keystroke would round-trip - the editor emits Markdown,
   * the parent stores it, the new prop comes back down, and the sync effect
   * replaces the document out from under the caret.
   */
  const settled = useRef(value);

  // Held in a ref so a parent that passes a fresh closure every render does not
  // force the editor to be rebuilt, which would cost the undo history.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const editor = useEditor({
    // Next renders this on the server first; Tiptap has to wait for the DOM.
    immediatelyRender: false,
    extensions: richTextExtensions(placeholder),
    content: value,
    contentType: "markdown",
    autofocus: autoFocus ? "end" : false,
    editorProps: {
      attributes: {
        class: "rte-surface",
        // A spellchecked contenteditable is what people expect of a comment box.
        spellcheck: "true",
      },
    },
    onUpdate: ({ editor: instance }) => {
      const markdown = instance.getMarkdown();
      settled.current = markdown;
      onChangeRef.current(markdown);
    },
  });

  /* --- the parent's value, when it is not ours -------------------------- */

  useEffect(() => {
    if (!editor || value === settled.current) return;
    settled.current = value;
    editor.commands.setContent(value, { contentType: "markdown", emitUpdate: false });
  }, [editor, value]);

  /* --- the source tab --------------------------------------------------- */

  const setSource = useCallback(
    (next: string) => {
      // Deliberately not routed through the editor: the textarea is the
      // authority while it is open, and parsing on every keystroke would
      // reformat half-written Markdown as it was being typed.
      settled.current = next;
      onChange(next);
    },
    [onChange],
  );

  const toRich = useCallback(() => {
    if (editor) editor.commands.setContent(value, { contentType: "markdown", emitUpdate: false });
    settled.current = value;
    setMode("rich");
  }, [editor, value]);

  return (
    <div className={cn("rte", className)}>
      <div className="rte-bar">
        {mode === "markdown" ? (
          <span className="rte-hint">Markdown &middot; **bold** `code` &gt; quote</span>
        ) : editor ? (
          <Toolbar editor={editor} variant={toolbar} />
        ) : (
          // The editor only exists once the browser has it; an empty strip of
          // the same height keeps the box from jumping when it arrives.
          <span className="rte-tools" aria-hidden />
        )}

        <span className="rte-bar-end">
          {aside}
          <span className="rte-tabs">
            <button
              type="button"
              onClick={toRich}
              aria-pressed={mode === "rich"}
              className={cn("rte-tab", mode === "rich" && "rte-tab-on")}
            >
              Rich text
            </button>
            <button
              type="button"
              onClick={() => setMode("markdown")}
              aria-pressed={mode === "markdown"}
              className={cn("rte-tab", mode === "markdown" && "rte-tab-on")}
            >
              Markdown
            </button>
          </span>
        </span>
      </div>

      {/* Both panes stay mounted and one is hidden, rather than one being
          swapped for the other. Unmounting `EditorContent` tears the
          ProseMirror view out of the DOM, and rebuilding it on the way back
          would cost the undo history for nothing. */}
      <div hidden={mode !== "rich"}>
        <EditorContent
          editor={editor}
          className="rte-content article-prose"
          style={{ minHeight: `${rows * 1.6}rem` }}
        />
      </div>
      <textarea
        value={value}
        onChange={(event) => setSource(event.target.value)}
        aria-label="Markdown source"
        className="rte-source"
        style={{ minHeight: `${rows * 1.6}rem` }}
        spellCheck={false}
        hidden={mode !== "markdown"}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Toolbar
 * ---------------------------------------------------------------------- */

function Toolbar({ editor, variant }: { editor: Editor; variant: "compact" | "full" }) {
  // One subscription for the whole strip rather than one per button: every
  // button's pressed state comes out of the same transaction.
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      strike: e.isActive("strike"),
      code: e.isActive("code"),
      link: e.isActive("link"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      task: e.isActive("taskList"),
      quote: e.isActive("blockquote"),
      codeBlock: e.isActive("codeBlock"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  const setLink = useCallback(() => {
    const current = (editor.getAttributes("link").href as string | undefined) ?? "";
    const href = window.prompt("Link to", current);
    if (href === null) return;
    if (href.trim() === "") {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: href.trim() }).run();
  }, [editor]);

  const full = variant === "full";

  return (
    <div className="rte-tools">
      <Tool label="Bold" on={state.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold />
      </Tool>
      <Tool label="Italic" on={state.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic />
      </Tool>
      <Tool
        label="Strikethrough"
        on={state.strike}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough />
      </Tool>
      <Tool label="Inline code" on={state.code} onClick={() => editor.chain().focus().toggleCode().run()}>
        <Code />
      </Tool>

      <span className="rte-sep" />

      <Tool
        label="Heading"
        on={state.h2}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 />
      </Tool>
      <Tool
        label="Subheading"
        on={state.h3}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 />
      </Tool>

      <span className="rte-sep" />

      <Tool
        label="Bulleted list"
        on={state.bullet}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List />
      </Tool>
      <Tool
        label="Numbered list"
        on={state.ordered}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered />
      </Tool>
      <Tool
        label="Task list"
        on={state.task}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
      >
        <ListChecks />
      </Tool>

      <span className="rte-sep" />

      <Tool label="Quote" on={state.quote} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote />
      </Tool>
      <Tool
        label="Code block"
        on={state.codeBlock}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        <Code2 />
      </Tool>
      <Tool label={state.link ? "Edit link" : "Add link"} on={state.link} onClick={setLink}>
        {state.link ? <Link2Off /> : <Link2 />}
      </Tool>

      {full && (
        <>
          <span className="rte-sep" />
          <Tool
            label="Table"
            onClick={() =>
              editor
                .chain()
                .focus()
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run()
            }
          >
            <Table />
          </Tool>
          <Tool
            label="Divider"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
          >
            <Minus />
          </Tool>
        </>
      )}

      <span className="rte-sep" />

      <Tool label="Undo" disabled={!state.canUndo} onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 />
      </Tool>
      <Tool label="Redo" disabled={!state.canRedo} onClick={() => editor.chain().focus().redo().run()}>
        <Redo2 />
      </Tool>
    </div>
  );
}

function Tool({
  children,
  label,
  on,
  disabled,
  onClick,
}: {
  children: ReactNode;
  label: string;
  on?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={on}
      disabled={disabled}
      // The toolbar lives above a contenteditable: letting the button take
      // focus would collapse the selection it is about to act on.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn("rte-tool", on && "rte-tool-on")}
    >
      {children}
    </button>
  );
}
