"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  Braces,
  Check,
  ClipboardCheck,
  History,
  MessagesSquare,
  Play,
  RotateCcw,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "./code-editor";
import { ResultPanel } from "./result-panel";
import { SubmissionsPanel, type SubmissionSummary } from "./submissions-panel";
import type { ExecutionResult, PracticeLanguage, PracticeSpec } from "@/types/practice";
import {
  INDENT_OPTIONS,
  setIndentSize,
  useIndentSize,
} from "@/lib/practice/indent-preference";

/**
 * Only the three fields the editor actually needs, rather than the whole
 * PracticeSpec. This is a client component, so every prop is serialized into
 * the RSC payload - passing the full spec shipped the statement, the example
 * cases and the tags a second time, on top of the server-rendered copy already
 * in the HTML.
 */
export type WorkspacePractice = Pick<PracticeSpec, "slug" | "languages" | "starterCode">;

interface PracticeWorkspaceProps {
  practice: WorkspacePractice;
  signedIn: boolean;
  /** Comment count for the problem's discussion page, shown in the action bar. */
  discussCount?: number;
}

/** How long after the last keystroke the draft is persisted. */
const AUTOSAVE_DELAY_MS = 1_500;

const LANGUAGE_LABELS: Record<PracticeLanguage, string> = {
  python: "Python",
  javascript: "JavaScript",
  cpp: "C++",
};

/** Which of the right pane's three surfaces is showing. */
type PaneTab = "editor" | "results" | "submissions";

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
export function PracticeWorkspace({ practice, signedIn, discussCount }: PracticeWorkspaceProps) {
  const [language, setLanguage] = useState<PracticeLanguage>(practice.languages[0]);
  const [solved, setSolved] = useState(false);

  // Stable identity: LanguagePane lists this in an effect's dependencies, and
  // an inline arrow would re-run the draft fetch every time `solved` flipped.
  const handleSolved = useCallback(() => setSolved(true), []);

  return (
    // Its own sheet inside the workspace frame: the tab strip, the editor and
    // the action bar read as one instrument, which is the point of drawing a
    // border around them rather than letting the editor bleed into the page.
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-surface-card">
      <LanguagePane
        key={language}
        practice={practice}
        language={language}
        signedIn={signedIn}
        solved={solved}
        discussCount={discussCount}
        onSolved={handleSolved}
        languagePicker={
          practice.languages.length > 1 ? (
            <select
              aria-label="Language"
              value={language}
              onChange={(event) => setLanguage(event.target.value as PracticeLanguage)}
              className="rounded-md border border-border bg-surface-card px-1.5 py-1 text-xs text-ink-soft transition-colors hover:text-ink"
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
  discussCount?: number;
  onSolved: () => void;
  languagePicker: React.ReactNode;
}

function LanguagePane({
  practice,
  language,
  signedIn,
  solved,
  discussCount,
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
  const [submissions, setSubmissions] = useState<SubmissionSummary[]>([]);
  const [tab, setTab] = useState<PaneTab>("editor");

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
        if (Array.isArray(payload.submissions)) {
          setSubmissions(payload.submissions);
          if (payload.submissions.some((s: { verdict: string }) => s.verdict === "ACCEPTED")) {
            onSolved();
          }
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
      // Pressing Run and watching nothing happen is what this avoids: the
      // verdict lives on another tab now, so the press has to take the reader
      // there rather than leaving them on the editor.
      setTab("results");

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
        if (kind === "submit") {
          // Newest first, which is the order the history endpoint returns.
          if (payload.submission) {
            setSubmissions((previous) => [payload.submission, ...previous]);
          }
          if (payload.result?.verdict === "ACCEPTED") onSolved();
        }
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
    setTab("editor");
  }, [starter]);

  return (
    <>
      <header className="flex shrink-0 flex-wrap items-center gap-1 border-b border-border bg-surface-2/40 px-2 py-1.5">
        <PaneTabButton
          icon={<Braces className="h-3.5 w-3.5" />}
          label="Editor"
          active={tab === "editor"}
          onSelect={() => setTab("editor")}
        />
        <PaneTabButton
          icon={<ClipboardCheck className="h-3.5 w-3.5" />}
          label="Results"
          active={tab === "results"}
          onSelect={() => setTab("results")}
          // A dot rather than a count: the tab only needs to say that there is
          // something here, and every number that matters is inside the panel.
          marker={
            running
              ? "animate-pulse bg-copper"
              : result
                ? result.verdict === "ACCEPTED"
                  ? "bg-signal-green-strong"
                  : "bg-signal-coral-strong"
                : null
          }
        />
        <PaneTabButton
          icon={<History className="h-3.5 w-3.5" />}
          label="Submissions"
          active={tab === "submissions"}
          onSelect={() => setTab("submissions")}
        />

        <div className="ml-auto flex items-center gap-2">
          {solved && (
            <span className="inline-flex items-center gap-1 rounded-full bg-signal-green-bg px-2 py-0.5 text-[0.65rem] font-semibold text-signal-green-strong">
              <Check className="h-3 w-3" /> Solved
            </span>
          )}

          {languagePicker}

          {/* Indent width is a per-reader preference, not a per-problem one, so
              it is remembered across problems and languages alike. */}
          <label className="flex items-center text-xs text-ink-soft">
            <span className="sr-only">Spaces per indent</span>
            <select
              aria-label="Spaces per indent"
              value={indentSize}
              onChange={(event) => setIndentSize(Number(event.target.value))}
              className="rounded-md border border-border bg-surface-card px-1.5 py-1 text-xs text-ink-soft transition-colors hover:text-ink"
            >
              {INDENT_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size} sp
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <div className="min-h-64 flex-1 overflow-hidden">
        {/*
          Hidden rather than unmounted. CodeMirror owns its undo history,
          scroll position and cursor, and all three go the moment this node
          leaves the tree - so a glance at Results would silently cost the
          reader every undo step they had.
        */}
        <div className={tab === "editor" ? "h-full" : "hidden"}>
          <CodeEditor
            value={code}
            language={language}
            dark={resolvedTheme === "dark"}
            indentSize={indentSize}
            onChange={handleChange}
            onRun={() => execute("run")}
          />
        </div>

        {tab === "results" && (
          <div className="h-full">
            <ResultPanel result={result} running={running} mode={mode} />
          </div>
        )}

        {tab === "submissions" && (
          <div className="h-full">
            <SubmissionsPanel submissions={submissions} signedIn={signedIn} />
          </div>
        )}
      </div>

      {notice && (
        <p className="shrink-0 border-t border-signal-coral/30 bg-signal-coral-bg/60 px-3 py-2 text-xs text-ink">
          {notice}
        </p>
      )}

      {!signedIn && (
        <p className="shrink-0 border-t border-border px-3 py-1.5 text-[0.7rem] text-ink-soft">
          Run works without an account. Sign in to submit against the hidden cases and keep your
          progress.
        </p>
      )}

      <div className="flex shrink-0 items-center gap-1.5 border-t border-border bg-surface-2/40 px-2 py-2">
        {/* The discussion is a page of its own rather than a pane in here: this
            workspace is locked to the viewport and its panes each scroll
            separately, so an article column has nowhere to go. Any unsaved
            edit is flushed on unmount, so leaving costs nothing. */}
        <Link
          href={`/discuss/practice/${practice.slug}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-ink-soft transition-colors hover:border-border-strong hover:text-ink"
        >
          <MessagesSquare className="h-3.5 w-3.5" />
          <span className="tabular-nums">({discussCount ?? 0})</span>
          <span className="sr-only">comments on this problem</span>
        </Link>

        <button
          type="button"
          onClick={reset}
          disabled={running}
          aria-label="Reset to the starter code"
          title="Reset to the starter code"
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border text-ink-soft transition-colors hover:border-border-strong hover:text-ink disabled:opacity-50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => execute("run")}
            disabled={running}
            // The ghost variant carries its own `dark:hover:bg-muted/50`, which
            // is a narrower variant key than a plain `hover:bg-*` and so wins
            // in dark mode however late mine is written. Hence the explicit
            // dark hover, rather than relying on tailwind-merge.
            className="bg-signal-green-bg text-signal-green-strong hover:bg-signal-green-bg hover:text-signal-green-strong hover:brightness-95 dark:hover:bg-signal-green-bg dark:hover:brightness-125"
          >
            <Play className="h-3.5 w-3.5" />
            Run Tests
          </Button>
          <Button
            size="sm"
            onClick={() => execute("submit")}
            disabled={running || !signedIn}
            className="bg-ink text-surface-card hover:bg-ink/85"
          >
            <Send className="h-3.5 w-3.5" />
            Submit
          </Button>
        </div>
      </div>
    </>
  );
}

function PaneTabButton({
  icon,
  label,
  active,
  onSelect,
  marker,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onSelect: () => void;
  /** Background classes for the status dot, or null for no dot. */
  marker?: string | null;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors ${
        active
          ? "border-border bg-surface-card font-medium text-ink shadow-sm"
          : "border-transparent text-ink-soft hover:bg-surface-3/60 hover:text-ink"
      }`}
    >
      {icon}
      {label}
      {marker && <span className={`h-1.5 w-1.5 rounded-full ${marker}`} />}
    </button>
  );
}
