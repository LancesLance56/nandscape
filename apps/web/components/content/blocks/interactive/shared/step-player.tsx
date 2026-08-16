"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

const PLAY_INTERVAL_MS = 1400;

/**
 * Transport controls shared by every stepped algorithm widget: play/pause,
 * single step either direction, reset, and a scrubber. Owns the "which frame
 * are we on" state so each widget only has to hand over a list of steps.
 *
 * Used by both the graph widgets and the backtracking widgets, which is why
 * it lives here rather than beside either of them.
 */
export function useStepPlayer(total: number, intervalMs: number = PLAY_INTERVAL_MS) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const totalRef = useRef(total);
  totalRef.current = total;

  // A new graph or a switched algorithm means the old frame number is
  // meaningless, so rewind rather than landing mid-run at a stale index.
  useEffect(() => {
    setIndex(0);
    setPlaying(false);
  }, [total]);

  useEffect(() => {
    if (!playing) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPlaying(false);
      return;
    }

    const id = window.setInterval(() => {
      setIndex((i) => {
        if (i >= totalRef.current - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [playing, intervalMs]);

  const atEnd = index >= total - 1;

  return {
    index,
    playing,
    atEnd,
    setIndex,
    play: () => {
      // Replaying from the end should start over, not sit still.
      if (atEnd) setIndex(0);
      setPlaying(true);
    },
    pause: () => setPlaying(false),
    next: () => {
      setPlaying(false);
      setIndex((i) => Math.min(i + 1, totalRef.current - 1));
    },
    prev: () => {
      setPlaying(false);
      setIndex((i) => Math.max(i - 1, 0));
    },
    reset: () => {
      setPlaying(false);
      setIndex(0);
    },
  };
}

interface StepControlsProps {
  index: number;
  total: number;
  playing: boolean;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onReset: () => void;
  onScrub: (i: number) => void;
  /** Extra control rendered inline, e.g. a playback-speed selector. */
  extra?: React.ReactNode;
}

export function StepControls({
  index,
  total,
  playing,
  onPlay,
  onPause,
  onNext,
  onPrev,
  onReset,
  onScrub,
  extra,
}: StepControlsProps) {
  const btn =
    "rounded-lg border border-border-strong px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="flex flex-col gap-3">
      <input
        type="range"
        min={0}
        max={Math.max(total - 1, 0)}
        value={index}
        onChange={(e) => onScrub(Number(e.target.value))}
        aria-label="Scrub through the algorithm steps"
        className="w-full accent-copper"
      />

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onPrev} disabled={index === 0} className={btn}>
          ← Back
        </button>

        <button
          type="button"
          onClick={playing ? onPause : onPlay}
          className={cn(
            "rounded-lg px-4 py-1.5 text-xs font-semibold text-white transition-colors",
            "bg-copper hover:bg-copper-dark",
          )}
        >
          {playing ? "Pause" : index >= total - 1 ? "Replay" : "Play"}
        </button>

        <button type="button" onClick={onNext} disabled={index >= total - 1} className={btn}>
          Step →
        </button>

        <button type="button" onClick={onReset} className={btn}>
          Reset
        </button>

        {extra}

        <span className="ml-auto text-xs text-slate">
          Step {index + 1} of {total}
        </span>
      </div>
    </div>
  );
}

/** The narration line under the diagram. Fixed height so the layout doesn't jump. */
export function StepCaption({ text }: { text: string }) {
  return (
    <p className="min-h-[3.5rem] rounded-lg border border-border bg-surface-2/50 px-3 py-2.5 text-sm leading-relaxed text-ink-soft">
      {text}
    </p>
  );
}
