"use client";

import { useEffect, useRef } from "react";
import { Compartment, EditorState, type Extension } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import {
  bracketMatching,
  indentOnInput,
  indentUnit,
  syntaxHighlighting,
} from "@codemirror/language";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import { cpp } from "@codemirror/lang-cpp";
import type { PracticeLanguage } from "@/types/practice";
import { indentString } from "@/lib/practice/indent-preference";
import {
  darkPlusHighlight,
  darkPlusTheme,
  lightPlusHighlight,
  lightPlusTheme,
} from "./editor-theme";

/**
 * CodeMirror 6 rather than Monaco.
 *
 * Monaco is the better desktop editor and would give real IntelliSense, but it
 * costs 2-5 MB and is effectively unusable on a touch screen. This is a public
 * teaching site aimed at beginners, where phone traffic is entirely normal, and
 * a problem page that cannot be opened on a phone is worse than one without
 * autocomplete. CodeMirror is around 50-100 kB with these two language modes,
 * works on mobile, and is more than enough editor for a twenty-line function -
 * which is the only thing anyone writes here.
 *
 * The extension set is assembled by hand (CodeMirror ships no batteries-included
 * bundle) and stays deliberately small: line numbers, history, bracket handling,
 * indent-on-input, and the language mode. No linting, no autocompletion popups -
 * a suggestion list that fires while a learner is still forming the idea is a
 * distraction rather than a help.
 *
 * Colours come from ./editor-theme, which is VS Code Dark+/Light+ - the same
 * pair Shiki renders every other code block on the site with.
 */

const LANGUAGE_MODES: Record<PracticeLanguage, () => Extension> = {
  python: () => python(),
  javascript: () => javascript(),
  cpp: () => cpp(),
};

/**
 * `indentUnit` is what Tab and auto-indent insert; `tabSize` is how a literal
 * tab character already in the document is rendered. Setting only the first
 * leaves pasted tabs displaying at CodeMirror's default width.
 */
function indentExtensions(size: number): Extension {
  return [indentUnit.of(indentString(size)), EditorState.tabSize.of(size)];
}

interface CodeEditorProps {
  value: string;
  language: PracticeLanguage;
  dark: boolean;
  onChange: (value: string) => void;
  /** Spaces per indent level. Reconfigured live, without losing undo history. */
  indentSize: number;
  /** Ctrl/Cmd+Enter, the shortcut people expect to mean "run". */
  onRun?: () => void;
}

export function CodeEditor({
  value,
  language,
  dark,
  indentSize,
  onChange,
  onRun,
}: CodeEditorProps) {
  const host = useRef<HTMLDivElement | null>(null);
  const view = useRef<EditorView | null>(null);
  // Indentation lives in a compartment rather than in the extension list, so
  // changing it is a reconfigure of the running editor. Rebuilding the editor
  // (which is what a language or theme change does) throws away undo history
  // and the cursor - acceptable when the document is being replaced anyway,
  // not acceptable for nudging a preference mid-solution.
  const indentCompartment = useRef(new Compartment());

  // Held in refs so the editor is not torn down and rebuilt every time the
  // parent re-renders with a new closure - which would lose the cursor
  // position on every keystroke. Assigned in an effect rather than during
  // render, because a ref write during render is not guaranteed to survive a
  // discarded render pass.
  const onChangeRef = useRef(onChange);
  const onRunRef = useRef(onRun);

  useEffect(() => {
    onChangeRef.current = onChange;
    onRunRef.current = onRun;
  }, [onChange, onRun]);

  useEffect(() => {
    if (!host.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        history(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        keymap.of([
          {
            key: "Mod-Enter",
            preventDefault: true,
            run: () => {
              onRunRef.current?.();
              return true;
            },
          },
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          // Tab indents rather than moving focus. The accessibility tradeoff is
          // real, so Escape-then-Tab still leaves the editor: that is what
          // indentWithTab's own escape hatch provides.
          indentWithTab,
        ]),
        LANGUAGE_MODES[language](),
        indentCompartment.current.of(indentExtensions(indentSize)),
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) onChangeRef.current(update.state.doc.toString());
        }),
        dark ? darkPlusTheme : lightPlusTheme,
        syntaxHighlighting(dark ? darkPlusHighlight : lightPlusHighlight, { fallback: true }),
      ],
    });

    const instance = new EditorView({ state, parent: host.current });
    view.current = instance;

    return () => {
      instance.destroy();
      view.current = null;
    };
    // Rebuilt only when the language or theme changes, since both are
    // structural parts of the extension list rather than reconfigurable state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, dark]);

  useEffect(() => {
    const instance = view.current;
    if (!instance) return;
    instance.dispatch({
      effects: indentCompartment.current.reconfigure(indentExtensions(indentSize)),
    });
  }, [indentSize]);

  // Adopt an externally supplied document (a loaded draft, or Reset to the
  // starter code) without disturbing anything the user is currently typing.
  useEffect(() => {
    const instance = view.current;
    if (!instance) return;
    const current = instance.state.doc.toString();
    if (current === value) return;
    instance.dispatch({
      changes: { from: 0, to: current.length, insert: value },
    });
  }, [value]);

  return <div ref={host} className="h-full w-full overflow-auto" />;
}
