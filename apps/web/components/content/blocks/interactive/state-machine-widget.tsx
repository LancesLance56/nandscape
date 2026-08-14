"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

const DEFAULT_TITLE = "Turnstile";
const DEFAULT_STATES = ["Locked", "Unlocked"];
const DEFAULT_INPUTS = ["Coin", "Push"];
const DEFAULT_TRANSITIONS: Record<string, string> = {
  "Locked|Coin": "Unlocked",
  "Locked|Push": "Locked",
  "Unlocked|Coin": "Unlocked",
  "Unlocked|Push": "Locked",
};

function resolveStringList(value: unknown, fallback: string[]): string[] {
  return Array.isArray(value) && value.length > 0 && value.every((v) => typeof v === "string")
    ? (value as string[])
    : fallback;
}

function resolveTransitions(value: unknown, fallback: Record<string, string>): Record<string, string> {
  if (typeof value !== "object" || value === null) return fallback;
  const entries = Object.entries(value as Record<string, unknown>).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string",
  );
  return entries.length > 0 ? Object.fromEntries(entries) : fallback;
}

/**
 * A finite state machine you drive by hand: click an input, watch the
 * active state jump along the transition table, see the path you took
 * trail behind you. Defaults to the classic turnstile (locked/unlocked,
 * coin/push) but `states`/`inputs`/`transitions`/`initial` are fully
 * data-driven, so a tutorial can swap in whatever machine it's teaching.
 * Card by default; pass `frame={false}` when embedding inside a context
 * that already provides its own surrounding card.
 */
export function StateMachineWidget({
  data,
  frame = true,
}: {
  data: Record<string, unknown>;
  frame?: boolean;
}) {
  const states = resolveStringList(data.states, DEFAULT_STATES);
  const inputs = resolveStringList(data.inputs, DEFAULT_INPUTS);
  const transitions = resolveTransitions(data.transitions, DEFAULT_TRANSITIONS);
  const initial =
    typeof data.initial === "string" && states.includes(data.initial) ? data.initial : states[0];
  const title = typeof data.title === "string" ? data.title : DEFAULT_TITLE;
  const className = typeof data.className === "string" ? data.className : undefined;

  const [current, setCurrent] = useState(initial);
  const [history, setHistory] = useState<string[]>([initial]);

  const fire = (input: string) => {
    const next = transitions[`${current}|${input}`];
    if (!next) return;
    setCurrent(next);
    setHistory((h) => [...h.slice(-4), next]);
  };

  const reset = () => {
    setCurrent(initial);
    setHistory([initial]);
  };

  return (
    <div className={cn(frame && "rounded-xl border border-border bg-surface-card p-5", className)}>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate">{title}</span>
        <button type="button" onClick={reset} className="text-xs font-semibold text-ink-soft transition-colors hover:text-ink">
          Reset
        </button>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        {states.map((state) => (
          <div
            key={state}
            className={cn(
              "flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 px-1 text-center text-xs font-bold transition-all",
              state === current
                ? "scale-110 border-copper bg-copper-bg text-copper-dark shadow-sm"
                : "border-border-strong bg-surface-2 text-slate",
            )}
          >
            {state}
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {inputs.map((input) => {
          const enabled = Boolean(transitions[`${current}|${input}`]);
          return (
            <button
              key={input}
              type="button"
              disabled={!enabled}
              onClick={() => fire(input)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors",
                enabled
                  ? "border-border-strong text-ink hover:bg-surface-2"
                  : "cursor-not-allowed border-border text-slate/50",
              )}
            >
              {input}
            </button>
          );
        })}
      </div>

      <p className="mt-4 truncate text-center text-xs text-slate">{history.join(" → ")}</p>
    </div>
  );
}
