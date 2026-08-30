"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * "Mark this lesson done", at the foot of a tutorial page.
 *
 * Optimistic, because the useful signal is the tick appearing immediately;
 * a failed request rolls it back rather than blocking the click behind a
 * spinner nobody wants to watch.
 *
 * Signed-out readers are shown a prompt to sign in instead of a button that
 * cannot persist. That is the honest version: progress is the one part of this
 * feature set that genuinely needs an account, because the place it is read
 * back (the dashboard) is behind one.
 */
export function TutorialComplete({
  pageSlug,
  trackSlug,
  initialCompleted,
  signedIn,
}: {
  pageSlug: string;
  trackSlug?: string | null;
  initialCompleted: boolean;
  signedIn: boolean;
}) {
  const [completed, setCompleted] = useState(initialCompleted);
  const [saving, setSaving] = useState(false);

  if (!signedIn) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-border-strong px-4 py-3 text-sm text-ink-soft">
        <Link href="/login" className="font-semibold text-copper hover:text-copper-dark">
          Sign in
        </Link>
        to track which lessons you have finished.
      </div>
    );
  }

  const toggle = async () => {
    const next = !completed;
    setCompleted(next);
    setSaving(true);

    try {
      const res = await fetch("/api/progress/tutorial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageSlug, trackSlug, completed: next }),
      });
      if (!res.ok) throw new Error();
      const body = (await res.json()) as { completed: boolean };
      // Trust the server's answer over the optimistic guess, so a rejected
      // toggle does not leave a tick that is not really there.
      setCompleted(body.completed);
    } catch {
      setCompleted(!next);
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={saving}
      aria-pressed={completed}
      className={cn(
        "flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors",
        completed
          ? "border-signal-green-strong/40 bg-signal-green-bg text-signal-green-strong"
          : "border-border-strong bg-surface-card text-ink-soft hover:border-ink-soft hover:text-ink",
      )}
    >
      <span
        className={cn(
          "flex size-5 items-center justify-center rounded-full border transition-colors",
          completed ? "border-signal-green-strong bg-signal-green-strong text-white" : "border-border-strong",
        )}
      >
        {saving ? (
          <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" />
        ) : (
          completed && <Check className="h-3 w-3" />
        )}
      </span>
      {completed ? "Completed" : "Mark as complete"}
    </button>
  );
}
