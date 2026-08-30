"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
// From preference-options, not preferences: the latter opens a Postgres pool,
// and importing a constant out of it here would pull `pg` into the browser
// bundle.
import {
  MAX_WEEKLY_GOAL,
  MIN_WEEKLY_GOAL,
  OVERVIEW_WIDGETS,
  type UserPreferences,
} from "@/lib/account/preference-options";
import type { PuzzleDifficulty } from "@/types/puzzle";
import { cn } from "@/lib/cn";

/**
 * The personalisation form.
 *
 * Saves the whole form at once rather than on every keystroke. An autosaving
 * settings page has to answer "did that save?" on its own, and here the reader
 * is changing four related things that only make sense together - the focus
 * track and the weekly goal are one decision about how much they intend to do.
 *
 * The pins are the exception and live on the circuits themselves (see
 * PinButton), because picking a circuit out of a list is not a form field.
 */

const DIFFICULTIES: { value: PuzzleDifficulty | ""; label: string }[] = [
  { value: "", label: "Any" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
  { value: "expert", label: "Expert" },
];

export interface PreferencesFormProps {
  initial: UserPreferences;
  /** Tracks that actually exist, so the focus picker can never point at one
   *  that was renamed or removed. */
  tracks: { slug: string; title: string; pages: number }[];
}

export function PreferencesForm({ initial, tracks }: PreferencesFormProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [focusTrackSlug, setFocus] = useState(initial.focusTrackSlug ?? "");
  const [weeklyGoal, setGoal] = useState(initial.weeklyGoal);
  const [difficulty, setDifficulty] = useState<PuzzleDifficulty | "">(
    initial.preferredDifficulty ?? "",
  );
  const [hidden, setHidden] = useState<string[]>(initial.hiddenWidgets);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleWidget(id: string) {
    setSaved(false);
    setHidden((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const response = await fetch("/api/account/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          focusTrackSlug: focusTrackSlug === "" ? null : focusTrackSlug,
          weeklyGoal,
          preferredDifficulty: difficulty === "" ? null : difficulty,
          hiddenWidgets: hidden,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? "Could not save your preferences.");
        return;
      }

      setSaved(true);
      // The overview reads these on the server, so it has to be re-rendered
      // for the change to show - local state alone would leave the dashboard
      // stale until the next full navigation.
      startTransition(() => router.refresh());
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  const labelClass = "text-xs font-medium text-ink-soft";
  const controlClass =
    "rounded-lg border border-border-strong bg-surface-card px-3 py-2 text-sm text-ink outline-none focus:border-copper";

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Focus track</span>
        <select
          value={focusTrackSlug}
          onChange={(event) => {
            setFocus(event.target.value);
            setSaved(false);
          }}
          className={controlClass}
        >
          <option value="">No focus track</option>
          {tracks.map((track) => (
            <option key={track.slug} value={track.slug}>
              {track.title} ({track.pages} lessons)
            </option>
          ))}
        </select>
        <span className="text-xxs text-slate">
          Your overview shows the next unfinished lesson in this track, and opens it first on the
          Progress page.
        </span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>
          Weekly goal: {weeklyGoal} {weeklyGoal === 1 ? "thing" : "things"}
        </span>
        <input
          type="range"
          min={MIN_WEEKLY_GOAL}
          max={MAX_WEEKLY_GOAL}
          value={weeklyGoal}
          onChange={(event) => {
            setGoal(Number(event.target.value));
            setSaved(false);
          }}
          className="accent-copper"
        />
        <span className="text-xxs text-slate">
          Lessons and quizzes finished in the last seven days, measured against this number.
        </span>
      </label>

      <fieldset className="flex flex-col gap-1.5">
        <legend className={labelClass}>Puzzle difficulty to suggest</legend>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {DIFFICULTIES.map((option) => (
            <button
              key={option.value || "any"}
              type="button"
              aria-pressed={difficulty === option.value}
              onClick={() => {
                setDifficulty(option.value);
                setSaved(false);
              }}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs transition-colors",
                difficulty === option.value
                  ? "border-copper bg-copper-bg font-medium text-copper-dark"
                  : "border-border text-ink-soft hover:border-border-strong hover:text-ink",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <span className="text-xxs text-slate">
          Only unsolved puzzles are ever suggested, so this narrows the pool rather than repeating
          what you have done.
        </span>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className={cn(labelClass, "mb-1")}>Cards on your overview</legend>
        {OVERVIEW_WIDGETS.map((widget) => {
          const shown = !hidden.includes(widget.id);
          return (
            <label
              key={widget.id}
              className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border p-2.5 transition-colors hover:border-border-strong"
            >
              <input
                type="checkbox"
                checked={shown}
                onChange={() => toggleWidget(widget.id)}
                className="mt-0.5 size-3.5 accent-copper"
              />
              <span className="min-w-0">
                <span className="block text-xs text-ink">{widget.label}</span>
                <span className="block text-xxs text-slate">{widget.description}</span>
              </span>
            </label>
          );
        })}
      </fieldset>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-copper px-5 py-2.5 text-sm font-semibold text-copper-ink transition-colors hover:bg-copper-dark disabled:opacity-60"
        >
          {saving && <Loader2 className="size-3.5 animate-spin" />}
          {saving ? "Saving…" : "Save preferences"}
        </button>

        {saved && (
          <span
            role="status"
            className="flex items-center gap-1 text-xs font-medium text-signal-green-strong"
          >
            <Check className="size-3.5" />
            Saved
          </span>
        )}
        {error && (
          <span role="alert" className="text-xs text-signal-coral-strong">
            {error}
          </span>
        )}
      </div>
    </form>
  );
}
