"use client";

import { useMemo, useState } from "react";
import { containerWaterSteps } from "@/lib/two-pointers/algorithms";
import { findMode, SHAPE_LABELS, type TwoPointerModeId } from "@/lib/two-pointers/modes";
import type { MatrixView, PointerLane } from "@/lib/two-pointers/types";
import { WidgetFrame } from "../widget-frame";
import { StepCaption, StepControls, useStepPlayer } from "../shared/step-player";
import { Banner, ChipRow, PanelBox, Segmented, StatReadout } from "../shared/widget-ui";
import { cn } from "@/lib/cn";

/* -------------------------------------------------------------------------
 * Lanes
 * ---------------------------------------------------------------------- */

/**
 * One cell's look per tone.
 *
 * `dropped` is the important one and the reason this widget exists: a
 * two-pointer solution is only believable once you can see the candidates it
 * throws away without ever looking at them.
 */
const TONE_CLASS: Record<string, string> = {
  idle: "bg-surface-3 text-ink-soft",
  active: "bg-copper text-copper-ink ring-2 ring-copper-dark",
  window: "bg-copper-bg text-copper-dark",
  dropped: "bg-surface-2 text-border-strong line-through",
  kept: "bg-signal-green/15 text-signal-green",
  hit: "bg-signal-green text-white",
};

function LaneView({ lane }: { lane: PointerLane }) {
  // Several pointers can land on the same cell (i and L are adjacent all the
  // way through 3Sum), so markers are collected per index rather than drawn
  // one row per pointer.
  const markers = new Map<number, string[]>();
  for (const [name, index] of Object.entries(lane.pointers)) {
    if (index < 0 || index >= lane.values.length) continue;
    const at = markers.get(index) ?? [];
    at.push(name);
    markers.set(index, at);
  }

  return (
    <div className="flex items-start gap-2">
      <span className="w-14 shrink-0 pt-2 text-[10px] font-semibold uppercase leading-none text-slate">
        {lane.label}
      </span>
      <div className="flex flex-wrap gap-1">
        {lane.values.map((value, i) => (
          <div key={i} className="flex flex-col items-center">
            <span
              className={cn(
                "flex h-8 min-w-8 items-center justify-center rounded px-1.5 font-mono text-xs font-bold tabular-nums transition-colors",
                TONE_CLASS[lane.tones?.[i] ?? "idle"],
              )}
            >
              {value}
            </span>
            {/* Reserved whether or not a marker is here, so the lane does not
                shift by a line as pointers move. */}
            <span className="h-3.5 text-[9px] font-bold leading-[0.875rem] text-copper-dark">
              {markers.get(i)?.join(" ") ?? ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** The `knows` matrix, for the celebrity problem. */
function MatrixPanel({ matrix }: { matrix: MatrixView }) {
  return (
    <PanelBox title="Does the row know the column?">
      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-0.5 text-[10px] tabular-nums">
          <thead>
            <tr>
              <th className="w-10" />
              {matrix.labels.map((l) => (
                <th key={l} className="w-8 pb-1 font-semibold text-slate">
                  {l.slice(0, 3)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row, i) => (
              <tr key={i}>
                <th className="pr-1 text-right font-semibold text-slate">{matrix.labels[i].slice(0, 3)}</th>
                {row.map((knows, j) => {
                  const queried = matrix.query?.[0] === i && matrix.query?.[1] === j;
                  return (
                    <td key={j}>
                      <span
                        className={cn(
                          "flex h-6 w-8 items-center justify-center rounded font-bold",
                          i === j
                            ? "bg-surface-2 text-border-strong"
                            : knows
                              ? "bg-copper-bg text-copper-dark"
                              : "bg-surface-3 text-slate",
                          queried && "ring-2 ring-copper",
                        )}
                      >
                        {i === j ? "–" : knows ? "yes" : "no"}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PanelBox>
  );
}

/* -------------------------------------------------------------------------
 * The explorer
 * ---------------------------------------------------------------------- */

/**
 * One widget for every problem on the two-pointer pages.
 *
 * A block picks a `mode` and may pass `modes` to offer a few side by side; the
 * inputs come from the block too, so a page can pose the exact array its prose
 * is talking about rather than a generic one.
 */
export function TwoPointerExplorerWidget({ data }: { data: Record<string, unknown> }) {
  const offered = useMemo(() => {
    const raw = data.modes;
    const ids = Array.isArray(raw) ? raw.filter((v): v is string => typeof v === "string") : [];
    const found = ids.map((id) => findMode(id)).filter((m, i, all) => all.indexOf(m) === i);
    return found.length > 0 ? found : [findMode(typeof data.mode === "string" ? data.mode : undefined)];
  }, [data.modes, data.mode]);

  const [modeId, setModeId] = useState<TwoPointerModeId>(
    () => (offered.find((m) => m.id === data.mode) ?? offered[0]).id,
  );
  const mode = useMemo(() => offered.find((m) => m.id === modeId) ?? offered[0], [offered, modeId]);

  const run = useMemo(() => mode.build(data), [mode, data]);
  const player = useStepPlayer(run.steps.length, 900);
  const step = run.steps[Math.min(player.index, run.steps.length - 1)];
  if (!step) return null;

  return (
    <WidgetFrame title="Two pointers" subtitle={SHAPE_LABELS[mode.shape]}>
      <div className="flex flex-col gap-4">
        {offered.length > 1 && (
          <Segmented
            label="Problem"
            options={offered.map((m) => ({ id: m.id, label: m.label }))}
            value={mode.id}
            onChange={(id) => setModeId(id)}
            variant="solid"
          />
        )}

        <p className="text-[11px] leading-relaxed text-slate">{mode.blurb}</p>

        <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface-2/40 p-3">
          {step.lanes.map((l, i) => (
            <LaneView key={`${l.label}-${i}`} lane={l} />
          ))}
        </div>

        {step.matrix && <MatrixPanel matrix={step.matrix} />}

        {step.stats && step.stats.length > 0 && (
          <StatReadout stats={[...step.stats, { label: "comparisons", value: step.comparisons }]} />
        )}

        <PanelBox title="Answers banked so far">
          <ChipRow items={step.results} emptyLabel="nothing yet" reserveRows={2} />
        </PanelBox>

        <StepCaption text={step.caption} />

        <StepControls
          index={player.index}
          total={run.steps.length}
          playing={player.playing}
          onPlay={player.play}
          onPause={player.pause}
          onNext={player.next}
          onPrev={player.prev}
          onReset={player.reset}
          onScrub={player.setIndex}
        />

        {player.atEnd && (
          <Banner tone="good">
            {run.answer} · {run.complexity}
          </Banner>
        )}

        {run.truncated && <Banner tone="info">This run hit the frame limit, so the tail is not shown.</Banner>}
      </div>
    </WidgetFrame>
  );
}

/* -------------------------------------------------------------------------
 * Container with most water
 * ---------------------------------------------------------------------- */

const BAR_AREA_HEIGHT = 170;

/**
 * The same pass as the explorer's `container` mode, drawn as walls and water.
 *
 * Worth its own widget because the argument is geometric: you have to see the
 * water level pinned to the shorter wall to believe that moving the taller one
 * cannot help.
 */
export function WaterContainerWidget({ data }: { data: Record<string, unknown> }) {
  const heights = useMemo(() => {
    const raw = data.values;
    return Array.isArray(raw) && raw.every((v) => typeof v === "number")
      ? (raw as number[])
      : [1, 8, 6, 2, 5, 4, 8, 3, 7];
  }, [data.values]);

  const run = useMemo(() => containerWaterSteps(heights), [heights]);
  const player = useStepPlayer(run.steps.length, 900);
  const step = run.steps[Math.min(player.index, run.steps.length - 1)];
  if (!step) return null;

  const lane = step.lanes[0];
  const n = heights.length;
  const max = Math.max(...heights, 1);
  const lo = lane.pointers.L ?? 0;
  const hi = lane.pointers.R ?? n - 1;
  const level = Math.min(heights[lo] ?? 0, heights[hi] ?? 0);
  const inRange = lo < hi;

  return (
    <WidgetFrame title="Container with most water" subtitle={`${n} walls`}>
      <div className="flex flex-col gap-4">
        <div className="relative rounded-lg border border-border bg-surface-2/40 p-3">
          {/* The water sits behind the walls, spanning the current pair and
              capped at the shorter of the two. */}
          {/* items-stretch, not items-end: the bars size themselves with a
              percentage height, which only resolves if their column is as tall
              as this box rather than as tall as its own content. */}
          <div className="relative flex items-stretch gap-1.5" style={{ height: BAR_AREA_HEIGHT }}>
            {inRange && (
              <div
                aria-hidden
                className="pointer-events-none absolute rounded-sm bg-copper/25"
                style={{
                  left: `${(lo / n) * 100}%`,
                  width: `${((hi - lo + 1) / n) * 100}%`,
                  bottom: 0,
                  height: `${(level / max) * 100}%`,
                }}
              />
            )}
            {heights.map((h, i) => {
              const tone = lane.tones?.[i] ?? "idle";
              return (
                <div key={i} className="relative flex flex-1 flex-col items-center justify-end gap-1">
                  <span
                    className={cn(
                      "w-full rounded-t-sm transition-all",
                      i === lo || i === hi
                        ? "bg-copper"
                        : tone === "dropped"
                          ? "bg-surface-3"
                          : tone === "kept"
                            ? "bg-signal-green"
                            : "bg-border-strong",
                    )}
                    style={{ height: `${(h / max) * 100}%` }}
                  />
                </div>
              );
            })}
          </div>

          <div className="mt-2 flex gap-1.5">
            {heights.map((h, i) => (
              <span
                key={i}
                className={cn(
                  "flex-1 text-center font-mono text-[10px] font-bold tabular-nums",
                  i === lo || i === hi ? "text-copper-dark" : "text-slate",
                )}
              >
                {h}
                <span className="block text-[9px] font-bold text-copper-dark">
                  {i === lo && i === hi ? "L R" : i === lo ? "L" : i === hi ? "R" : " "}
                </span>
              </span>
            ))}
          </div>
        </div>

        {step.stats && <StatReadout stats={step.stats} />}

        <StepCaption text={step.caption} />

        <StepControls
          index={player.index}
          total={run.steps.length}
          playing={player.playing}
          onPlay={player.play}
          onPause={player.pause}
          onNext={player.next}
          onPrev={player.prev}
          onReset={player.reset}
          onScrub={player.setIndex}
        />

        {player.atEnd && (
          <Banner tone="good">
            {run.answer} · {run.complexity}
          </Banner>
        )}
      </div>
    </WidgetFrame>
  );
}
