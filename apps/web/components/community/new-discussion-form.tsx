"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/content/rich-text-editor";
import { MAX_TITLE_LENGTH, MIN_TITLE_LENGTH } from "@/lib/community/limits";

/**
 * Opening a standalone thread: a title and a Markdown body.
 *
 * Two fields, because a discussion needs exactly two things - what it is
 * called and what it says. Anything else here would be a field somebody has to
 * think about before they can ask a question.
 */
export function NewDiscussionForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const titleLeft = MAX_TITLE_LENGTH - title.length;
  const ready = title.trim().length >= MIN_TITLE_LENGTH && body.trim().length > 0;

  async function submit() {
    if (!ready || submitting) return;
    setSubmitting(true);
    setError(null);

    const response = await fetch("/api/community/discussions/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), body: body.trim() }),
    }).catch(() => null);

    if (!response?.ok) {
      const data = (await response?.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Could not post that. Try again.");
      setSubmitting(false);
      return;
    }

    const data = (await response.json()) as { slug: string };
    // replace, not push: the empty form should not be a back-button
    // destination once the thread it made already exists.
    router.replace(`/discuss/general/${data.slug}`);
  }

  return (
    <div className="max-w-3xl">
      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate">
        Title
      </label>
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value.slice(0, MAX_TITLE_LENGTH))}
        placeholder="What is the actual question?"
        autoFocus
        className="mb-1.5 block w-full rounded-lg border border-border bg-surface-card px-3 py-2.5 text-sm text-ink outline-none placeholder:text-slate focus:border-copper"
      />
      <p className="mb-6 text-xs text-slate">
        {title.trim().length < MIN_TITLE_LENGTH
          ? "A few more words - a title people can scan in a list."
          : `${titleLeft} characters left`}
      </p>

      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate">
        Body
      </label>
      <RichTextEditor
        value={body}
        onChange={setBody}
        rows={14}
        toolbar="full"
        // One line, not the old Markdown cheat sheet: the toolbar is the cheat
        // sheet now, and a placeholder is drawn inside a single empty
        // paragraph rather than across the whole box.
        placeholder="What you tried, what happened, and what you expected instead."
      />

      {error && <p className="mt-3 text-xs text-signal-coral">{error}</p>}

      <div className="mt-4 flex items-center gap-3">
        <Button size="app" onClick={submit} disabled={!ready || submitting}>
          {submitting ? "Posting..." : "Post discussion"}
        </Button>
        <Button size="app" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
