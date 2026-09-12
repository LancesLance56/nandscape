import { Markdown } from "@tiptap/markdown";
import { StarterKit } from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TableKit } from "@tiptap/extension-table";
import type { Extensions } from "@tiptap/core";

/**
 * The one schema every rich-text surface on the site edits.
 *
 * Markdown is still the stored format - `CodingProblem.statement`, a
 * discussion body and every seed JSON file hold Markdown text, and
 * `MarkdownProse` is what renders them - so this schema is chosen to be
 * exactly as wide as the dialect that renderer accepts, and no wider. Anything
 * Tiptap could express but GFM cannot (colours, font sizes, arbitrary HTML)
 * would survive the editing session and then vanish the moment the value was
 * serialised, which is a worse experience than never offering it.
 *
 * So: the StarterKit block and inline set, plus the three things GFM adds that
 * `remark-gfm` already renders on the published page - tables, task lists and
 * strikethrough - and nothing else.
 *
 * `@tiptap/markdown` is the official parser/serialiser. Every extension here
 * carries its own `parseMarkdown`/`renderMarkdown` spec, which is what makes
 * the round trip lossless rather than a best-effort HTML conversion: a `##`
 * comes back as a `##`, a fence keeps its language, a table keeps its
 * alignment row.
 */
export function richTextExtensions(placeholder?: string): Extensions {
  return [
    StarterKit.configure({
      // A reader-facing link: not followed on click inside the editor, because
      // in an editor a click is an attempt to put the caret somewhere.
      link: {
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "nofollow noreferrer", target: "_blank" },
      },
      // Underline has no Markdown spelling. Offering the button would produce
      // a style that silently disappears on save.
      underline: false,
    }),

    TaskList,
    TaskItem.configure({ nested: true }),

    // Column resizing writes pixel widths into the document, and a Markdown
    // table has nowhere to put them.
    TableKit.configure({ table: { resizable: false } }),

    Markdown.configure({
      // Two spaces per level, which is what the existing seed files and
      // statements are written with; four would re-indent every list in the
      // corpus the first time somebody opened it in the editor.
      indentation: { style: "space", size: 2 },
    }),

    Placeholder.configure({ placeholder: placeholder ?? "" }),
  ];
}
