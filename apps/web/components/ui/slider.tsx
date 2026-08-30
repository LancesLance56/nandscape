"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";

/**
 * The site's slider.
 *
 * Derived from Watermelon UI's adaptive-slider, which is a showcase piece
 * rather than a control: it ships inside its own 60vh card, labels itself
 * "Calories", and swaps between three neon gradients as the value climbs.
 * None of that survives here. What was worth keeping is how it is built: a
 * fully transparent native `<input type="range">` sits on top, so focus,
 * arrow keys, page-up/down and screen readers all work exactly as they would
 * on a bare input, while the visible track and thumb are ordinary divs that
 * spring toward the new position. That is why this can look like this and
 * still be more accessible than the styled `accent-copper` inputs it replaces.
 *
 * The geometry is the one fiddly part. The thumb travels `100% - THUMB` and
 * the fill has to end under its centre, so both offsets are written in terms
 * of THUMB rather than as a flat percentage; otherwise the fill overshoots the
 * thumb at the right-hand end.
 */

/** Thumb diameter in px. The track insets and fill width are derived from it. */
const THUMB = 16;

export function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  disabled,
  className,
  "aria-label": ariaLabel,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const reduceMotion = useReducedMotion();

  // A zero-width range (min === max) would divide by zero and NaN the layout.
  // It happens for real: a step player renders before its steps are computed.
  const span = Math.max(max - min, 1);
  const percent = Math.min(100, Math.max(0, ((value - min) / span) * 100));

  const travel = `calc(${percent} / 100 * (100% - ${THUMB}px))`;
  const transition = reduceMotion ? { duration: 0 } : { type: "spring" as const, stiffness: 320, damping: 32 };

  return (
    <div
      className={cn("group relative flex h-5 w-full items-center", disabled && "pointer-events-none opacity-50", className)}
    >
      <span aria-hidden className="absolute inset-x-0 h-1.5 rounded-full border border-border bg-surface-2" />

      <motion.span
        aria-hidden
        className="absolute left-0 h-1.5 rounded-full bg-copper"
        animate={{ width: `calc(${travel} + ${THUMB / 2}px)` }}
        transition={transition}
      />

      <motion.span
        aria-hidden
        className="absolute rounded-full border-2 border-copper bg-surface-card shadow-[0_1px_3px_rgba(20,27,20,0.25)] transition-transform group-hover:scale-110 group-active:scale-95 motion-reduce:transition-none"
        style={{ width: THUMB, height: THUMB }}
        animate={{ left: travel }}
        transition={transition}
      />

      {/* The real control. Invisible, full-bleed, and on top of everything, so
          every native interaction keeps working and the divs above are pure
          decoration. */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => onChange(Number(e.target.value))}
        className="absolute inset-0 z-10 w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
      />
    </div>
  );
}
