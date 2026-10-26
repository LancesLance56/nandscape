"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Pause, Play } from "lucide-react";
import { BfsGraph, BFS_STEPS } from "./tool-art";

const REDUCED = "(prefers-reduced-motion: reduce)";

function subscribeReduced(onChange: () => void) {
  const query = window.matchMedia(REDUCED);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * The hero's one live thing: a breadth-first search you can watch, pause and
 * scrub.
 *
 * It plays on its own, looping, until the reader takes over; touching the
 * slider pauses it so the step they dragged to stays put. The card is white in
 * both themes, which is what makes it the brightest thing on a dark page, so
 * the graph inside it is drawn in the light palette whatever the theme.
 */
export function HeroBfs() {
  const [step, setStep] = useState(0);
  /** null until the reader presses play or pause: until then it is automatic. */
  const [chosen, setChosen] = useState<boolean | null>(null);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );

  // Under reduced motion it starts paused, part-way through, so the still
  // frame still says what the widget is.
  const playing = chosen ?? !reduced;
  const shown = chosen === null && reduced ? 3 : step;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!playing || !visible) return;
    const timer = setInterval(() => setStep((s) => (s + 1) % BFS_STEPS), 1100);
    return () => clearInterval(timer);
  }, [playing, visible]);

  return (
    <div
      ref={ref}
      className="relative flex flex-col gap-2.5 rounded-[22px] border-2 border-[#1d1f22] bg-white p-3.5 pb-3 shadow-[0_6px_0_#1d1f22] [color-scheme:light] sm:gap-3.5 sm:rounded-[28px] sm:p-5 sm:pb-[18px] sm:shadow-[0_8px_0_#1d1f22] dark:border-[#121315] dark:shadow-[0_8px_0_#121315]"
    >
      <BfsGraph step={shown} r={19} edge={2} startRing palette="light" className="block w-full" />

      <div className="flex items-center gap-3.5">
        <button
          type="button"
          onClick={() => {
            setStep(shown);
            setChosen(!playing);
          }}
          aria-label={playing ? "Pause" : "Play"}
          className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full bg-[#1d1f22] text-white shadow-[0_3px_0_#ff751a] transition-transform active:translate-y-0.5 active:shadow-[0_1px_0_#ff751a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff751a] motion-reduce:transition-none sm:h-12 sm:w-12 sm:shadow-[0_4px_0_#ff751a]"
        >
          {playing ? <Pause className="h-[18px] w-[18px] fill-current" /> : <Play className="ml-0.5 h-[18px] w-[18px] fill-current" />}
        </button>
        <input
          type="range"
          min={0}
          max={BFS_STEPS - 1}
          step={1}
          value={shown}
          onChange={(e) => {
            setChosen(false);
            setStep(Number(e.target.value));
          }}
          aria-label="Step through the search"
          aria-valuetext={`${shown} of ${BFS_STEPS - 1} nodes visited`}
          className="h-11 min-w-0 flex-1 cursor-pointer accent-[#ff751a] sm:h-7"
        />
      </div>
    </div>
  );
}
