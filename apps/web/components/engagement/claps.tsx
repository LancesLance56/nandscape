"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Hand } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Applause, Medium-style: tap repeatedly, up to an allowance.
 *
 * Two things make this feel right, and both are about latency. The count moves
 * the instant you tap rather than when the server answers, so holding the
 * button reads as one continuous gesture. And the taps are batched: a burst of
 * twelve becomes one request carrying twelve, sent once you stop, instead of
 * twelve requests racing each other.
 *
 * It works signed out. Readers without a session get a random id kept in
 * localStorage, which is the whole reason claps can sit on a public article
 * without a sign-up wall in front of them. See lib/engagement/claps.ts for why
 * that identifier is deliberately weak.
 */

const FLUSH_DELAY_MS = 600;
const STORAGE_KEY = "nandscape:clapper-id";

export type ClapTargetKind = "BLOG" | "TUTORIAL";

/**
 * A stable-per-browser id for a reader with no account.
 *
 * Created lazily on the first clap rather than on mount, so a reader who never
 * claps is never given an identifier at all.
 */
function readClapperId(): string {
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const fresh = crypto.randomUUID().replace(/-/g, "");
    window.localStorage.setItem(STORAGE_KEY, fresh);
    return fresh;
  } catch {
    // Private mode, or storage disabled. A per-session id still lets this
    // reader clap; it just will not be remembered next visit.
    return crypto.randomUUID().replace(/-/g, "");
  }
}

export function Claps({
  kind,
  slug,
  className,
}: {
  kind: ClapTargetKind;
  slug: string;
  className?: string;
}) {
  const [total, setTotal] = useState<number | null>(null);
  const [mine, setMine] = useState(0);
  const [max, setMax] = useState(50);
  const [bursting, setBursting] = useState(false);

  const pending = useRef(0);
  const timer = useRef<number | null>(null);
  const reduceMotion = useReducedMotion();

  // Initial read. The anon id is only sent if this browser already has one, so
  // a first-time reader is not tagged just for loading the page.
  useEffect(() => {
    let cancelled = false;
    const stored = (() => {
      try {
        return window.localStorage.getItem(STORAGE_KEY);
      } catch {
        return null;
      }
    })();

    const params = new URLSearchParams({ kind, slug });
    if (stored) params.set("anonId", stored);

    fetch(`/api/claps?${params}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { total: number; mine: number; max: number } | null) => {
        if (cancelled || !body) return;
        setTotal(body.total);
        setMine(body.mine);
        setMax(body.max);
      })
      .catch(() => {
        // A count that will not load should not break the article around it.
        if (!cancelled) setTotal(0);
      });

    return () => {
      cancelled = true;
    };
  }, [kind, slug]);

  const flush = useCallback(() => {
    const amount = pending.current;
    pending.current = 0;
    if (amount < 1) return;

    fetch("/api/claps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, slug, amount, anonId: readClapperId() }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { total: number; mine: number; max: number } | null) => {
        if (!body) return;
        // The server is the authority on both numbers, so a rejected or
        // clamped burst corrects the optimistic count rather than drifting.
        setTotal(body.total);
        setMine(body.mine);
        setMax(body.max);
      })
      .catch(() => {
        // Roll the optimistic count back to what the server last confirmed.
        setTotal((t) => (t === null ? t : Math.max(0, t - amount)));
        setMine((m) => Math.max(0, m - amount));
      });
  }, [kind, slug]);

  // A burst still in the buffer when the reader navigates away would be lost,
  // so unmounting sends it.
  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
      flush();
    };
  }, [flush]);

  const clap = () => {
    if (mine >= max) return;

    setTotal((t) => (t ?? 0) + 1);
    setMine((m) => m + 1);
    pending.current += 1;

    setBursting(true);
    window.setTimeout(() => setBursting(false), 220);

    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, FLUSH_DELAY_MS);
  };

  const spent = mine >= max;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <button
        type="button"
        onClick={clap}
        disabled={spent}
        aria-label={spent ? `You have given all ${max} claps` : `Clap for this (${mine} of ${max} given)`}
        className={cn(
          "group relative flex size-11 items-center justify-center rounded-full border transition-colors",
          spent
            ? "cursor-default border-border bg-surface-2 text-slate"
            : "border-border-strong bg-surface-card text-ink-soft hover:border-copper hover:text-copper active:scale-95",
        )}
      >
        <motion.span
          animate={bursting && !reduceMotion ? { scale: [1, 1.28, 1] } : { scale: 1 }}
          transition={{ duration: 0.22 }}
          className="flex items-center justify-center"
        >
          <Hand className="h-4.5 w-4.5" />
        </motion.span>

        {/* The reader's own tally, so the allowance is visible without a
            second line of chrome. */}
        {mine > 0 && (
          <span className="absolute -bottom-1 -right-1 rounded-full border border-border bg-surface px-1.5 text-[10px] font-semibold tabular-nums text-copper-dark">
            {mine}
          </span>
        )}
      </button>

      <span className="text-xs text-slate">
        {total === null ? (
          <span className="opacity-0">0 claps</span>
        ) : (
          <>
            <span className="font-semibold tabular-nums text-ink">{total.toLocaleString()}</span>{" "}
            {total === 1 ? "clap" : "claps"}
          </>
        )}
      </span>
    </div>
  );
}
