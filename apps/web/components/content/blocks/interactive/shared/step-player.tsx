"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, Shuffle } from "lucide-react";
import { cn } from "@/lib/cn";
import { Slider } from "@/components/ui/slider";

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
      <Slider
        min={0}
        max={Math.max(total - 1, 0)}
        value={index}
        onChange={onScrub}
        aria-label="Scrub through the algorithm steps"
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

/**
 * The narration line under the diagram. Height is *fixed*, not just a minimum:
 * a long caption scrolls inside its own box rather than pushing everything
 * below it down, so the widget never changes height as the reader steps.
 */
export function StepCaption({ text }: { text: string }) {
  return (
    <p className="h-[3.75rem] overflow-y-auto rounded-lg border border-border bg-surface-2/50 px-3 py-2.5 text-sm leading-relaxed text-ink-soft">
      {text}
    </p>
  );
}

/* -------------------------------------------------------------------------- */
/* Icon transport                                                             */
/* -------------------------------------------------------------------------- */

interface StepTransportProps {
  index: number;
  total: number;
  playing: boolean;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onReset: () => void;
  /** Rendered as a sixth button when given, e.g. re-roll the input. */
  onShuffle?: () => void;
  size?: "sm" | "md";
  className?: string;
}

/**
 * The same transport as `StepControls`, drawn as icon buttons rather than
 * labelled ones.
 *
 * Both exist on purpose. `StepControls` is a full-width strip that owns its
 * own scrubber and step counter, which suits a widget whose whole body is one
 * diagram. This one is a fixed-width cluster that composes: it sits in a
 * toolbar next to counters, or centred under a stage, and leaves the scrubber
 * and the counter to whatever is laying the widget out.
 */
export function StepTransport({
  index,
  total,
  playing,
  onPlay,
  onPause,
  onNext,
  onPrev,
  onReset,
  onShuffle,
  size = "md",
  className,
}: StepTransportProps) {
  const box = size === "md" ? "h-[30px] w-[30px]" : "h-[26px] w-[26px]";
  const glyph = size === "md" ? "size-3.5" : "size-3";
  const btn = cn(
    box,
    "grid place-items-center rounded-md border border-border-strong text-ink-soft transition-colors",
    "hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40",
  );

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button type="button" onClick={onPrev} disabled={index === 0} className={btn} aria-label="Previous step">
        <ChevronLeft className={glyph} />
      </button>
      <button
        type="button"
        onClick={playing ? onPause : onPlay}
        className={cn(
          box,
          "grid place-items-center rounded-md bg-copper text-copper-ink transition-colors hover:bg-copper-dark",
        )}
        aria-label={playing ? "Pause" : index >= total - 1 ? "Replay from the start" : "Play"}
      >
        {playing ? <Pause className={glyph} /> : <Play className={glyph} />}
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={index >= total - 1}
        className={btn}
        aria-label="Next step"
      >
        <ChevronRight className={glyph} />
      </button>
      <button type="button" onClick={onReset} className={btn} aria-label="Reset">
        <RotateCcw className={glyph} />
      </button>
      {onShuffle && (
        <button type="button" onClick={onShuffle} className={btn} aria-label="Shuffle the input">
          <Shuffle className={glyph} />
        </button>
      )}
    </div>
  );
}
