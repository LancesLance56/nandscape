"use client";

import { useEffect, useRef, useState } from "react";
import { shikiOptions } from "@/lib/shiki-code";
import { indentString, useIndentSize } from "@/lib/practice/indent-preference";

const HIGHLIGHT_DEBOUNCE_MS = 200;

/**
 * A code textarea with live Shiki highlighting behind it.
 *
 * Same technique the blog editor's live preview uses - `shiki/bundle/web`,
 * dynamically imported and debounced, so no grammar reaches the bundle until a
 * language is actually typed in - and the same options object, from
 * lib/shiki-code.ts, so a snippet looks identical here, in the blog editor and
 * on the published page.
 *
 * The editing surface is a transparent textarea stacked exactly on top of the
 * highlighted `<pre>`: the caret and selection are the browser's real ones, so
 * every editing behaviour (undo, spellcheck off, IME, screen readers) keeps
 * working, and only the painted text comes from Shiki.
 *
 * Both layers wrap (`pre-wrap`) and the box grows to its content instead of
 * scrolling. That is what removes the usual failure of this technique: with no
 * independent scrolling in either layer, there is no scroll position to keep
 * in sync, so the text can never drift out of alignment with its highlighting.
 */
export function CodeField({
  value,
  language,
  onChange,
  minRows = 8,
}: {
  value: string;
  language: string;
  onChange: (next: string) => void;
  minRows?: number;
}) {
  const [html, setHtml] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  // The same preference the learner-facing editor uses, so an author writing a
  // starter stub indents it the way the reader will see it.
  const indentSize = useIndentSize();

  useEffect(() => {
    let cancelled = false;
    if (timer.current) window.clearTimeout(timer.current);

    timer.current = window.setTimeout(() => {
      import("shiki/bundle/web")
        .then(({ codeToHtml }) =>
          // A trailing newline would render one blank highlighted line taller
          // than the textarea reports, nudging the two layers apart.
          codeToHtml(value.replace(/\n$/, ""), shikiOptions(language, "")),
        )
        .then((result) => {
          if (!cancelled) setHtml(result);
        })
        .catch(() => {
          // Unknown grammar: fall through to the plain text layer rather than
          // leaving the field stuck on the previous language's colours.
          if (!cancelled) setHtml(null);
        });
    }, HIGHLIGHT_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [value, language]);


  // Every metric that affects glyph position has to match between the two
  // layers, so both read from this one object.
  const shared: React.CSSProperties = {
    margin: 0,
    padding: "14px 16px",
    fontFamily: "var(--font-mono)",
    fontSize: "12.5px",
    lineHeight: 1.75,
    letterSpacing: "normal",
    tabSize: indentSize,
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
    wordBreak: "break-word",
    border: 0,
  };

  return (
    <div
      style={{
        position: "relative",
        // The highlight layer is in flow and sizes to the code; this only
        // stops an empty field collapsing to its own padding.
        minHeight: `calc(${minRows} * 1.75 * 12.5px + 28px)`,
      }}
    >
      <div
        aria-hidden
        className="studio-code-highlight"
        style={{ ...shared, minHeight: "100%", pointerEvents: "none" }}
        {...(html
          ? { dangerouslySetInnerHTML: { __html: html } }
          : { children: <span style={{ color: "var(--ink)" }}>{value}</span> })}
      />
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        style={{
          ...shared,
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          resize: "none",
          overflow: "hidden",
          background: "transparent",
          // The glyphs come from the layer underneath; only the caret and the
          // selection highlight are painted by the textarea itself.
          color: "transparent",
          caretColor: "var(--ink)",
        }}
        onKeyDown={(event) => {
          // Tab indents rather than leaving the field. Shift-Tab still escapes,
          // so the section stays keyboard-navigable.
          if (event.key !== "Tab" || event.shiftKey) return;
          event.preventDefault();
          const target = event.currentTarget;
          const { selectionStart, selectionEnd } = target;
          const indent = indentString(indentSize);
          const next = `${value.slice(0, selectionStart)}${indent}${value.slice(selectionEnd)}`;
          onChange(next);
          requestAnimationFrame(() => {
            target.selectionStart = target.selectionEnd = selectionStart + indent.length;
          });
        }}
      />
    </div>
  );
}
