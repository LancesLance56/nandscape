import { EditorView } from "@codemirror/view";
import { HighlightStyle } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import type { Extension } from "@codemirror/state";

/**
 * VS Code Dark+ / Light+ for CodeMirror.
 *
 * Replaces the One Dark theme the editor shipped with, so that code the reader
 * *writes* looks like the code they just *read*: every code block on the site
 * is rendered by Shiki using this same `dark-plus`/`light-plus` pair (see
 * lib/shiki.ts), and a problem statement in Dark+ sitting beside an editor in
 * One Dark reads as two different products bolted together.
 *
 * The colours below are the VS Code defaults Shiki's themes are built from, so
 * the two agree token for token rather than merely both being dark.
 */

const DARK = {
  background: "#1e1e1e",
  foreground: "#d4d4d4",
  caret: "#aeafad",
  selection: "#264f78",
  lineNumber: "#858585",
  lineNumberActive: "#c6c6c6",
  activeLine: "#ffffff0a",
  matchingBracket: "#3a3d41",
  comment: "#6a9955",
  string: "#ce9178",
  number: "#b5cea8",
  keyword: "#569cd6",
  controlKeyword: "#c586c0",
  function: "#dcdcaa",
  variable: "#9cdcfe",
  type: "#4ec9b0",
  operator: "#d4d4d4",
  invalid: "#f44747",
};

const LIGHT = {
  background: "#ffffff",
  foreground: "#000000",
  caret: "#000000",
  selection: "#add6ff",
  lineNumber: "#237893",
  lineNumberActive: "#0b216f",
  activeLine: "#0000000a",
  matchingBracket: "#e7e7e7",
  comment: "#008000",
  string: "#a31515",
  number: "#098658",
  keyword: "#0000ff",
  controlKeyword: "#af00db",
  function: "#795e26",
  variable: "#001080",
  type: "#267f99",
  operator: "#000000",
  invalid: "#cd3131",
};

type Palette = typeof DARK;

function buildTheme(palette: Palette, dark: boolean): Extension {
  return EditorView.theme(
    {
      "&": {
        color: palette.foreground,
        backgroundColor: palette.background,
        height: "100%",
        fontSize: "13px",
      },
      ".cm-content": {
        caretColor: palette.caret,
        // Room to the left of the first character so a cursor at column 0 is
        // not flush against the gutter.
        padding: "0.75rem 0",
      },
      ".cm-scroller": {
        fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)",
        lineHeight: "1.6",
      },
      "&.cm-focused": { outline: "none" },
      ".cm-cursor, .cm-dropCursor": { borderLeftColor: palette.caret },
      // CodeMirror renders the selection layer itself once the editor is
      // focused, so both selectors are needed for the colour to hold in either
      // state.
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
        { backgroundColor: palette.selection },
      ".cm-activeLine": { backgroundColor: palette.activeLine },
      ".cm-gutters": {
        backgroundColor: palette.background,
        color: palette.lineNumber,
        border: "none",
        paddingRight: "0.5rem",
      },
      ".cm-activeLineGutter": {
        backgroundColor: "transparent",
        color: palette.lineNumberActive,
      },
      ".cm-matchingBracket, .cm-nonmatchingBracket": {
        backgroundColor: palette.matchingBracket,
        outline: "none",
      },
    },
    { dark },
  );
}

function buildHighlight(palette: Palette): HighlightStyle {
  return HighlightStyle.define([
    { tag: [tags.comment, tags.lineComment, tags.blockComment], color: palette.comment },
    { tag: [tags.string, tags.special(tags.string)], color: palette.string },
    { tag: [tags.number, tags.bool, tags.null], color: palette.number },
    // Dark+ distinguishes control flow (if/for/return) from declaration
    // keywords (def/class/const) - the purple/blue split people recognise.
    {
      tag: [tags.controlKeyword, tags.moduleKeyword],
      color: palette.controlKeyword,
    },
    {
      tag: [tags.keyword, tags.operatorKeyword, tags.definitionKeyword, tags.self],
      color: palette.keyword,
    },
    {
      tag: [tags.function(tags.variableName), tags.function(tags.propertyName)],
      color: palette.function,
    },
    {
      tag: [tags.variableName, tags.propertyName, tags.attributeName],
      color: palette.variable,
    },
    {
      tag: [tags.typeName, tags.className, tags.namespace, tags.standard(tags.typeName)],
      color: palette.type,
    },
    { tag: [tags.operator, tags.punctuation, tags.separator, tags.bracket], color: palette.operator },
    { tag: tags.invalid, color: palette.invalid },
  ]);
}

export const darkPlusTheme = buildTheme(DARK, true);
export const lightPlusTheme = buildTheme(LIGHT, false);
export const darkPlusHighlight = buildHighlight(DARK);
export const lightPlusHighlight = buildHighlight(LIGHT);
