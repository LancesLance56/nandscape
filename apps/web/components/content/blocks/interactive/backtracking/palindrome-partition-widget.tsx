"use client";

import { useMemo, useState } from "react";
import { isPalindrome, palindromePartitionSteps, type PalindromePayload } from "@/lib/backtracking/puzzles";
import { cn } from "@/lib/cn";
import { PanelBox, type SegmentedGroup } from "../shared/widget-ui";
import { BacktrackingRunner } from "./backtracking-runner";

const PRESETS = [
  { id: "aabaa", label: "aabaa" },
  { id: "aab", label: "aab" },
  { id: "banana", label: "banana" },
];

export function PalindromePartitionWidget({ data }: { data: Record<string, unknown> }) {
  const given = typeof data.text === "string" && data.text.length > 0 ? data.text.slice(0, 8) : null;
  const presets = useMemo(
    () => (given && !PRESETS.some((p) => p.id === given) ? [{ id: given, label: given }, ...PRESETS] : PRESETS),
    [given],
  );

  const [text, setText] = useState(given ?? PRESETS[0].id);
  const [showTable, setShowTable] = useState(false);

  const run = useMemo(() => palindromePartitionSteps(text), [text]);

  const toggles: SegmentedGroup[] = [
    {
      id: "text",
      label: "String",
      active: text,
      onChange: setText,
      options: presets.map((p) => ({ id: p.id, label: p.label })),
    },
    {
      id: "table",
      label: "Palindrome table",
      active: showTable ? "on" : "off",
      onChange: (id) => setShowTable(id === "on"),
      options: [
        { id: "off", label: "Hide" },
        { id: "on", label: "Show" },
      ],
    },
  ];

  return (
    <BacktrackingRunner
      run={run}
      toggles={toggles}
      solutionsLabel="Partitions found"
      showDeadInLegend={false}
      hint="Single characters are always palindromes, so a partition always exists. The question is how many."
      visual={(step) => {
        const p = step.payload as PalindromePayload | undefined;
        return (
          <div className="flex flex-col gap-3">
            <StringStrip payload={p} text={text} />
            {showTable && <PalindromeTable text={text} payload={p} />}
          </div>
        );
      }}
      panel={(step) => {
        const p = step.payload as PalindromePayload | undefined;
        return (
          <PanelBox title="Pieces committed so far" bodyClassName="h-14 overflow-y-auto">
            {p && p.parts.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1">
                {p.parts.map((part, i) => (
                  <span key={i} className="rounded-md bg-signal-green/15 px-2 py-1 font-mono text-xs font-bold text-signal-green">
                    {part}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-xs italic text-slate">nothing cut yet</span>
            )}
          </PanelBox>
        );
      }}
    />
  );
}

/** The string with committed cuts and the piece currently under test. */
function StringStrip({ text, payload }: { text: string; payload: PalindromePayload | undefined }) {
  const parts = payload?.parts ?? [];
  const committedUpTo = parts.join("").length;
  const start = payload?.start ?? 0;
  const end = payload?.end ?? null;
  const ok = payload?.isPalindrome ?? true;

  return (
    <div className="rounded-lg border border-border bg-surface-2/40 p-3">
      <div className="mb-2 text-[11px] font-semibold text-slate">The string</div>
      <div className="flex flex-wrap items-center gap-0.5">
        {[...text].map((ch, i) => {
          const committed = i < committedUpTo;
          const testing = end !== null && i >= start && i <= end;

          // A bar sits between committed pieces so the cuts read as cuts
          // rather than as a colour change.
          const cutBefore = committed && parts.some((_, pi) => parts.slice(0, pi).join("").length === i && i > 0);

          return (
            <span key={i} className="flex items-center">
              {cutBefore && <span className="mx-0.5 h-8 w-0.5 rounded bg-copper" aria-hidden />}
              <span
                className={cn(
                  "flex h-9 w-8 items-center justify-center rounded-md border font-mono text-sm font-bold transition-colors",
                  committed && "border-signal-green bg-signal-green/15 text-signal-green",
                  testing && ok && "border-copper bg-copper text-white",
                  testing && !ok && "border-signal-coral bg-signal-coral/25 text-signal-coral",
                  !committed && !testing && "border-border-strong bg-surface text-ink-soft",
                )}
              >
                {ch}
              </span>
            </span>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-slate">
        {end !== null ? (
          <>
            Testing <span className="font-mono font-bold text-ink">{text.slice(start, end + 1)}</span>:{" "}
            {ok ? (
              <span className="font-semibold text-signal-green">a palindrome, so this cut is allowed</span>
            ) : (
              <span className="font-semibold text-signal-coral">not a palindrome, so this cut is rejected</span>
            )}
          </>
        ) : (
          "Green pieces are locked in for this branch."
        )}
      </p>
    </div>
  );
}

/**
 * The precomputed isPalindrome table.
 *
 * Worth showing because the naive version re-tests the same substrings over
 * and over: "aa" inside "aabaa" gets checked on many different branches. The
 * table turns each of those O(k) checks into one lookup, which is the
 * standard optimisation for this problem.
 */
function PalindromeTable({ text, payload }: { text: string; payload: PalindromePayload | undefined }) {
  const activeStart = payload?.start ?? -1;
  const activeEnd = payload?.end ?? -1;

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface-2/40 p-3">
      <div className="mb-2 text-[11px] font-semibold text-slate">
        isPalindrome[start][end], precomputed once instead of re-tested per branch
      </div>
      <table className="border-separate border-spacing-0.5 text-[10px]">
        <thead>
          <tr>
            <th className="w-6" />
            {[...text].map((ch, j) => (
              <th key={j} className="w-6 pb-1 font-mono font-bold text-slate">
                {ch}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...text].map((ch, i) => (
            <tr key={i}>
              <th className="pr-1 text-right font-mono font-bold text-slate">{ch}</th>
              {[...text].map((_, j) => {
                if (j < i) return <td key={j} className="h-6 w-6" />;
                const yes = isPalindrome(text, i, j);
                const isActive = i === activeStart && j === activeEnd;
                return (
                  <td
                    key={j}
                    className={cn(
                      "h-6 w-6 rounded text-center font-bold",
                      yes ? "bg-signal-green/20 text-signal-green" : "bg-surface-3 text-border-strong",
                      isActive && "ring-2 ring-copper",
                    )}
                  >
                    {yes ? "T" : "F"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-slate">
        Row is the start index, column is the end index. Only the upper triangle is meaningful, since a piece cannot end
        before it starts.
      </p>
    </div>
  );
}
