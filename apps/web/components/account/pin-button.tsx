"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pin, PinOff } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Pin a circuit to the top of the dashboard, or unpin it.
 *
 * Sends the whole resulting list rather than "add this id", because the pin
 * order is the list order and there is a cap on its length - both of which are
 * properties of the list, not of any one pin. The server re-derives and
 * re-clamps it anyway (see sanitizePreferences); this just keeps the request
 * saying what the reader actually meant.
 */
export function PinButton({
  projectId,
  pinned,
  currentPins,
  atLimit,
}: {
  projectId: string;
  pinned: boolean;
  currentPins: string[];
  /** True when the reader already has the maximum number pinned, so an
   *  unpinned circuit's button explains itself instead of silently failing. */
  atLimit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);

  const blocked = !pinned && atLimit;

  async function toggle() {
    if (blocked) return;
    setSaving(true);

    const next = pinned
      ? currentPins.filter((id) => id !== projectId)
      : [...currentPins, projectId];

    try {
      const response = await fetch("/api/account/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinnedProjectIds: next }),
      });
      if (response.ok) startTransition(() => router.refresh());
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={saving || pending || blocked}
      aria-pressed={pinned}
      title={
        blocked ? "Unpin another circuit first" : pinned ? "Unpin from dashboard" : "Pin to dashboard"
      }
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-lg border transition-colors",
        pinned
          ? "border-copper bg-copper-bg text-copper-dark"
          : "border-border text-slate hover:border-border-strong hover:text-ink",
        blocked && "cursor-not-allowed opacity-40",
      )}
    >
      {pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
      <span className="sr-only">{pinned ? "Unpin" : "Pin"}</span>
    </button>
  );
}
