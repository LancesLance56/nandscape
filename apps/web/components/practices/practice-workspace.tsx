"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Play, Send, RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "./code-editor";
import { ResultPanel } from "./result-panel";
import type { ExecutionResult, PracticeLanguage, PracticeSpec } from "@/types/practice";
import {
  INDENT_OPTIONS,
  setIndentSize,
  useIndentSize,
} from "@/lib/practice/indent-preference";

/**
 * Only the three fields the editor actually needs, rather than the whole
 * PracticeSpec. This is a client component, so every prop is serialized into
 * the RSC payload — passing the full spec shipped the statement, the example
 * cases and the tags a second time, on top of the server-rendered copy already
 * in the HTML.
 */
export type WorkspacePractice = Pick<PracticeSpec, "slug" | "languages" | "starterCode">;

interface PracticeWorkspaceProps {
  practice: WorkspacePractice;
  signedIn: boolean;
}

/** How long after the last keystroke the draft is persisted. */
const AUTOSAVE_DELAY_MS = 1_500;

const LANGUAGE_LABELS: Record<PracticeLanguage, string> = {
  python: "Python",
  javascript: "JavaScript",
  cpp: "C++",
};

/**
 * Owns only what outlives a language switch: which language is selected, and
 * whether this problem has ever been accepted.
 *
 * Everything tied to one language - the document, the last result, the draft -
 * lives in LanguagePane below, which is keyed by language. Switching the
 * picker therefore remounts it with the right starting document instead of an
 * effect reaching in to overwrite state after the fact, which is both simpler
 * and avoids a frame where the previous language's code is shown under the new
 * language's syntax highlighting.
 */
export function PracticeWorkspace({ practice, signedIn }: PracticeWorkspaceProps) {
  const [language, setLanguage] = useState<PracticeLanguage>(practice.languages[0]);
  const [solved, setSolved] = useState(false);

  // Stable identity: LanguagePane lists this in an effect's dependencies, and
  // an inline arrow would re-run the draft fetch every time `solved` flipped.
  const handleSolved = useCallback(() => setSolved(true), []);

  return (
    // Rounded card on mobile, where it sits in normal flow under the
    // statement; flush and borderless from `lg` up, where it *is* the right
    // half of the viewport and a border would just be a seam next to the
    // divider the statement pane already draws.
    <div className="flex h-full min-h-0 flex-col rounded-lg border border-border bg-surface-card lg:rounded-none lg:border-0">
      <LanguagePane
        key={language}
        practice={practice}
        language={language}
        signedIn={signedIn}
        solved={solved}
        onSolved={handleSolved}
        languagePicker={
          practice.languages.length > 1 ? (
            <select
              aria-label="Language"
              value={language}
              onChange={(event) => setLanguage(event.target.value as PracticeLanguage)}
              className="rounded-md border border-border bg-surface-2 px-2 py-1 text-xs text-ink"
            >
              {practice.languages.map((id) => (
                <option key={id} value={id}>
                  {LANGUAGE_LABELS[id]}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-xs text-ink-soft">{LANGUAGE_LABELS[language]}</span>
          )
        }
      />
    </div>
  );
}

interface LanguagePaneProps {
  practice: WorkspacePractice;
  language: PracticeLanguage;
  signedIn: boolean;
  solved: boolean;
  onSolved: () => void;
  languagePicker: React.ReactNode;
}

function LanguagePane({
  practice,
  language,
  signedIn,
  solved,
  onSolved,
  languagePicker,
}: LanguagePaneProps) {
  const { resolvedTheme } = useTheme();
  const indentSize = useIndentSize();
  const starter = practice.starterCode[language] ?? "";

  const [code, setCode] = useState(starter);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [mode, setMode] = useState<"run" | "submit" | null>(null);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** The edit not yet written back, or null once a save has gone out. */
  const pending = useRef<{ code: string; language: PracticeLanguage } | null>(null);
  // Keeps the autosave from firing for code the user never typed - the draft
  // that was just loaded, or the starter stub this pane mounted with.
  const dirty = useRef(false);

  /** Restore any saved draft for this language over the starter stub. */
  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;

    fetch(`/api/practices/${practice.slug}/draft?language=${language}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (cancelled || !payload) return;
        // Only if the reader has not started typing in the meantime - a slow
        // response must never overwrite work done while it was in flight.
        if (!dirty.current && typeof payload.draft?.code === "string" && payload.draft.code) {
          setCode(payload.draft.code);
        }
        if (
          Array.isArray(payload.submissions) &&
          payload.submissions.some((s: { verdict: string }) => s.verdict === "ACCEPTED")
        ) {
          onSolved();
        }
      })
      .catch(() => {
        // A failed draft fetch needs no error state: the starter code is
        // already in the editor and the page works without it.
      });

    return () => {
      cancelled = true;
    };
  }, [language, practice.slug, signedIn, onSolved]);

  /**
   * Send whatever is unsaved, and forget it.
   *
   * `pending` doubles as the "is there unsaved work" flag, so the unmount
   * flush below cannot fire a second, redundant PUT for an edit the debounce
   * already wrote.
   */
  const persistDraft = useCallback(
    (keepalive: boolean) => {
      const payload = pending.current;
      if (!signedIn || payload === null) return;
      pending.current = null;
      fetch(`/api/practices/${practice.slug}/draft`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        // Lets the request outlive the page when the reader navigates away
        // mid-debounce, which is otherwise the second way edits are lost.
        keepalive,
      }).catch(() => {});
    },
    [signedIn, practice.slug],
  );

  /** Debounced autosave. */
  useEffect(() => {
    if (!signedIn || pending.current === null) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persistDraft(false), AUTOSAVE_DELAY_MS);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [code, signedIn, persistDraft]);

  /**
   * Unmount-only flush.
   *
   * This pane is keyed by language, so switching the picker unmounts it and
   * takes both the queued PUT and the `code` state holding those edits with
   * it. The flush cannot live in the debounce effect's cleanup: that effect
   * re-runs on every keystroke, so it would send a request per character and
   * defeat the debounce entirely.
   */
  useEffect(() => () => persistDraft(true), [persistDraft]);

  const handleChange = useCallback(
    (next: string) => {
      dirty.current = true;
      pending.current = { code: next, language };
      setCode(next);
    },
    [language],
  );

  const execute = useCallback(
    async (kind: "run" | "submit") => {
      if (running) return;
      setRunning(true);
      setMode(kind);
      setNotice(null);

      try {
        const response = await fetch(`/api/practices/${practice.slug}/${kind}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ language, code }),
        });

        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          setResult(null);
          setNotice(payload?.error ?? "Something went wrong talking to the judge.");
          return;
        }

        setResult(payload.result);
        if (kind === "submit" && payload.result?.verdict === "ACCEPTED") onSolved();
      } catch {
        setResult(null);
        setNotice("Could not reach the judge. Check your connection and try again.");
      } finally {
        setRunning(false);
      }
    },
    [code, language, practice.slug, running, onSolved],
  );

  const reset = useCallback(() => {
    dirty.current = true;
    setCode(starter);
    setResult(null);
  }, [starter]);

  return (
    <>
      <header className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        {languagePicker}

        {/* Indent width is a per-reader preference, not a per-problem one, so it
            is remembered across problems and languages alike. */}
        <label className="flex items-center gap-1.5 text-xs text-ink-soft">
          <span className="sr-only sm:not-sr-only">Indent</span>
          <select
            aria-label="Spaces per indent"
            value={indentSize}
            onChange={(event) => setIndentSize(Number(event.target.value))}
            className="rounded-md border border-border bg-surface-2 px-1.5 py-1 text-xs text-ink"
          >
            {INDENT_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        {solved && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-signal-green-strong">
            <Check className="h-3 w-3" /> Solved
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={reset} disabled={running}>
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
          <Button variant="outline" size="sm" onClick={() => execute("run")} disabled={running}>
            <Play className="h-3.5 w-3.5" />
            Run
          </Button>
          <Button size="sm" onClick={() => execute("submit")} disabled={running || !signedIn}>
            <Send className="h-3.5 w-3.5" />
            Submit
          </Button>
        </div>
      </header>

      <div className="min-h-64 flex-1 overflow-hidden">
        <CodeEditor
          value={code}
          language={language}
          dark={resolvedTheme === "dark"}
          indentSize={indentSize}
          onChange={handleChange}
          onRun={() => execute("run")}
        />
      </div>

      {notice && (
        <p className="border-b border-border bg-signal-coral-bg/60 px-3 py-2 text-xs text-ink">
          {notice}
        </p>
      )}

      {!signedIn && (
        <p className="border-b border-border px-3 py-2 text-xs text-ink-soft">
          You can run the examples without an account. Sign in to submit against the hidden cases
          and keep your progress.
        </p>
      )}

      <div className="h-72 shrink-0 overflow-hidden border-t border-border lg:h-2/5">
        <ResultPanel result={result} running={running} mode={mode} />
      </div>
    </>
  );
}
