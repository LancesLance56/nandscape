"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { ActionDock, WidgetShell } from "./shared/widget-shell";
import { WidgetButton } from "./shared/widget-ui";

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
    <WidgetShell
      kind="State machines"
      singleView
      title={title}
      bare={!frame}
      className={className}
      prompt={`It is ${current}. Send an input and see where it goes.`}
      stage={
        <div className="flex flex-col items-center gap-5">
          <div className="flex flex-wrap justify-center gap-4">
            {states.map((state) => (
              <div
                key={state}
                aria-current={state === current ? "true" : undefined}
                className={cn(
                  "grid size-20 shrink-0 place-items-center rounded-full border-2 px-1 text-center text-[13px] font-bold transition-all",
                  state === current
                    ? "border-[3px] border-copper bg-copper-bg text-copper-dark shadow-[0_0_0_8px_color-mix(in_srgb,var(--copper)_12%,transparent)]"
                    : "border-border-strong bg-surface-card text-slate",
                )}
              >
                {state}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-2.5">
            {inputs.map((input) => {
              const enabled = Boolean(transitions[`${current}|${input}`]);
              return (
                <WidgetButton key={input} size="md" disabled={!enabled} onClick={() => fire(input)} className="min-w-24">
                  {input}
                </WidgetButton>
              );
            })}
          </div>
        </div>
      }
      readout={
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate">
          {history.map((h, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && "→"}
              <span
                className={cn(
                  "rounded-md px-2 py-0.5 font-semibold",
                  i === history.length - 1 ? "bg-copper-bg text-copper-dark" : "bg-surface-2 text-ink-soft",
                )}
              >
                {h}
              </span>
            </span>
          ))}
        </div>
      }
      dock={
        <ActionDock hint="Inputs with no arrow out of the current state are greyed out.">
          <WidgetButton onClick={reset}>Reset</WidgetButton>
        </ActionDock>
      }
    />
  );
}
