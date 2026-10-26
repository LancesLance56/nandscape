"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, Shuffle } from "lucide-react";
import { cn } from "@/lib/cn";
import { Slider } from "@/components/ui/slider";

const PLAY_INTERVAL_MS = 1400;

/** Playback speeds offered in the dock. 1 is the default. */
export const PLAY_SPEEDS = [0.5, 1, 2] as const;
export type PlaySpeed = (typeof PLAY_SPEEDS)[number];

/**
 * Transport state shared by every stepped algorithm widget: play/pause,
 * single step either direction, reset, scrub and speed. Owns the "which frame
 * are we on" state so each widget only has to hand over a list of steps.
 *
 * Used by the graph, backtracking, DP, sorting and two-pointer widgets, which
 * is why it lives in shared/ rather than beside any one of them.
 */
export function useStepPlayer(total: number, intervalMs: number = PLAY_INTERVAL_MS) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<PlaySpeed>(1);
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
    }, intervalMs / speed);

    return () => window.clearInterval(id);
  }, [playing, intervalMs, speed]);

  const atEnd = index >= total - 1;

  return {
    index,
    playing,
    atEnd,
    speed,
    setSpeed,
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

export type StepPlayer = ReturnType<typeof useStepPlayer>;

/* -------------------------------------------------------------------------- */
/* Transport dock                                                             */
/* -------------------------------------------------------------------------- */

const ICON_BTN =
  "grid size-8 shrink-0 place-items-center rounded-lg border border-border-strong bg-surface-card text-ink-soft transition-colors hover:border-slate hover:text-ink disabled:cursor-not-allowed disabled:opacity-40";
const GHOST_BTN =
  "grid size-8 shrink-0 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-surface-3 hover:text-ink";

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
  /** Shows a speed button (cycles 0.5x / 1x / 2x) when given. */
  speed?: PlaySpeed;
  onSpeed?: (s: PlaySpeed) => void;
  /** Adds a shuffle button beside reset, e.g. re-roll the input. */
  onShuffle?: () => void;
  /** Extra control rendered at the end of the dock. */
  extra?: ReactNode;
  className?: string;
}

/**
 * The transport dock: back / play / next, the scrubber with the step count,
 * then speed and reset (and shuffle). One row that never wraps, down to a
 * phone's width: the scrubber is the part that gives way, and speed is a
 * single button that cycles rather than a three-way switch. Renders only its
 * row; WidgetShell supplies the tinted bar it sits in, so the same controls
 * also work loose, as the flowchart viewer uses them.
 */
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
  speed,
  onSpeed,
  onShuffle,
  extra,
  className,
}: StepControlsProps) {
  const last = Math.max(total - 1, 0);

  return (
    <div className={cn("flex w-full min-w-0 flex-nowrap items-center gap-1.5 sm:gap-2.5", className)}>
      <button type="button" onClick={onPrev} disabled={index === 0} className={ICON_BTN} aria-label="Previous step">
        <ChevronLeft className="size-4" />
      </button>
      <button
        type="button"
        onClick={playing ? onPause : onPlay}
        className="grid size-10 shrink-0 place-items-center rounded-full bg-copper text-copper-ink shadow-[0_6px_14px_-6px_var(--copper)] transition-colors hover:bg-copper-dark"
        aria-label={playing ? "Pause" : index >= last ? "Replay from the start" : "Play"}
      >
        {playing ? <Pause className="size-4 fill-current" /> : <Play className="ml-0.5 size-4 fill-current" />}
      </button>
      <button type="button" onClick={onNext} disabled={index >= last} className={ICON_BTN} aria-label="Next step">
        <ChevronRight className="size-4" />
      </button>

      <Slider
        min={0}
        max={last}
        value={index}
        onChange={onScrub}
        aria-label="Scrub through the algorithm steps"
        className="mx-1 min-w-12 flex-1"
      />

      <span className="shrink-0 whitespace-nowrap font-mono text-xs tabular-nums text-ink-soft">
        <b className="font-semibold text-ink">{index + 1}</b>/{total}
      </span>

      {speed !== undefined && onSpeed && (
        <button
          type="button"
          onClick={() => onSpeed(PLAY_SPEEDS[(PLAY_SPEEDS.indexOf(speed) + 1) % PLAY_SPEEDS.length])}
          title="Playback speed"
          aria-label={`Playback speed ${speed}x, click to change`}
          // The first thing to go when the dock is narrow (a phone-width tile).
          className="h-8 w-11 shrink-0 rounded-lg bg-surface-3 font-mono text-xs font-semibold text-ink transition-colors hover:bg-surface-4 @max-[22rem]:hidden"
        >
          {speed}×
        </button>
      )}

      <button type="button" onClick={onReset} className={GHOST_BTN} aria-label="Reset">
        <RotateCcw className="size-4" />
      </button>
      {onShuffle && (
        <button type="button" onClick={onShuffle} className={GHOST_BTN} aria-label="Shuffle the input">
          <Shuffle className="size-4" />
        </button>
      )}

      {extra}
    </div>
  );
}

/** StepControls wired straight to a `useStepPlayer` result. */
export function PlayerDock({
  player,
  total,
  onShuffle,
  onReset,
  extra,
}: {
  player: StepPlayer;
  total: number;
  onShuffle?: () => void;
  /** Overrides the player's own reset, e.g. to also clear widget state. */
  onReset?: () => void;
  extra?: ReactNode;
}) {
  return (
    <StepControls
      index={player.index}
      total={total}
      playing={player.playing}
      onPlay={player.play}
      onPause={player.pause}
      onNext={player.next}
      onPrev={player.prev}
      onReset={onReset ?? player.reset}
      onScrub={player.setIndex}
      speed={player.speed}
      onSpeed={player.setSpeed}
      onShuffle={onShuffle}
      extra={extra}
    />
  );
}

/**
 * A narration line on its own, for layouts that do not go through
 * WidgetShell. Height is *fixed*, not just a minimum: a long caption scrolls
 * inside its own box rather than pushing everything below it down, so the
 * widget never changes height as the reader steps.
 */
export function StepCaption({ text, step }: { text: ReactNode; step?: ReactNode }) {
  return (
    <div className="flex h-[4.5rem] items-start gap-3 overflow-y-auto">
      {step !== undefined && (
        <span className="h-6 min-w-7 shrink-0 rounded-md bg-copper-bg px-1.5 text-center text-xs font-bold leading-6 tabular-nums text-copper-dark">
          {step}
        </span>
      )}
      <p className="mt-0.5 text-sm leading-[1.55] text-ink">{text}</p>
    </div>
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
 * The same transport as `StepControls` without the scrubber and counter: a
 * fixed-width cluster that composes into a toolbar next to other controls.
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
  const box = size === "md" ? "size-8" : "size-7";
  const glyph = size === "md" ? "size-3.5" : "size-3";
  const btn = cn(
    box,
    "grid place-items-center rounded-lg border border-border-strong bg-surface-card text-ink-soft transition-colors",
    "hover:border-slate hover:text-ink disabled:cursor-not-allowed disabled:opacity-40",
  );

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button type="button" onClick={onPrev} disabled={index === 0} className={btn} aria-label="Previous step">
        <ChevronLeft className={glyph} />
      </button>
      <button
        type="button"
        onClick={playing ? onPause : onPlay}
        className={cn(box, "grid place-items-center rounded-full bg-copper text-copper-ink transition-colors hover:bg-copper-dark")}
        aria-label={playing ? "Pause" : index >= total - 1 ? "Replay from the start" : "Play"}
      >
        {playing ? <Pause className={cn(glyph, "fill-current")} /> : <Play className={cn(glyph, "fill-current")} />}
      </button>
      <button type="button" onClick={onNext} disabled={index >= total - 1} className={btn} aria-label="Next step">
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
