"use client";

import { createContext, useContext, useId, type ButtonHTMLAttributes, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/cn";

/**
 * The chrome shared by every interactive widget.
 *
 * Before this file each widget grew its own copy: `Stat` existed four times,
 * `Banner` twice, and the segmented toggle appeared in sixteen files, nine of
 * them byte-identical and the rest quietly drifted to different paddings and
 * radii. Anything that appears in more than one widget belongs here, so that
 * changing how a stat or a toggle looks is one edit rather than sixteen.
 */

/* -------------------------------------------------------------------------- */
/* Segmented control                                                          */
/* -------------------------------------------------------------------------- */

export interface SegmentedOption<T extends string> {
  id: T;
  label: string;
  /** Shown on hover, for options whose label has to stay terse. */
  hint?: string;
}

/**
 * The mode / size / strategy picker, e.g. "BFS | DFS" or "Tree | Depth profile".
 *
 * Built on the Base UI toggle group rather than a row of buttons, which is what
 * every hand-rolled copy was, so the arrow keys move between options and the
 * group is announced as one control instead of as n unrelated pressed buttons.
 */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  size = "sm",
  variant = "outline",
  className,
}: {
  /** Rendered before the options. Omit for a bare group. */
  label?: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (id: T) => void;
  size?: "sm" | "xs";
  /**
   * `solid` is for the one control that picks what the widget is showing, e.g.
   * BFS against DFS. `outline` is for everything secondary alongside it, such
   * as which example graph or which board size. Two looks, chosen on purpose;
   * before this there were four, arrived at by accident.
   */
  variant?: "outline" | "solid";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {label && <span className="text-xs font-medium text-slate">{label}</span>}
      <ToggleGroup
        aria-label={label}
        value={[value]}
        onValueChange={(next) => {
          // Base UI hands back an array. The empty case is ignored so clicking
          // the active option cannot deselect it: these are all "pick exactly
          // one" choices, and a widget with no mode selected has nothing to
          // draw.
          const picked = next[0] as T | undefined;
          if (picked && picked !== value) onChange(picked);
        }}
        // flex-wrap is load-bearing. The toggle-group primitive is `w-fit
        // flex-row` with no wrapping, so a group with more than about four
        // options runs off the side of a phone: the sorting visualiser's seven
        // algorithms measured 465px against a 375px viewport and dragged the
        // whole homepage into horizontal scroll. The buttons this replaced were
        // in a plain flex-wrap row and wrapped for free.
        className={cn(
          "flex-wrap",
          variant === "solid" ? "gap-0.5 rounded-[10px] bg-surface-2 p-[3px]" : "gap-1",
        )}
      >
        {options.map((opt) => (
          <ToggleGroupItem
            key={opt.id}
            value={opt.id}
            title={opt.hint}
            // Every item gets the identical class string, and the selected look
            // comes from `aria-pressed:` variants rather than a React-derived
            // conditional. Deriving it from `value` meant two sources of truth
            // for which option is active: the toggle group's own state drives
            // the attribute, React state drove the colours, and they disagreed
            // for a frame on every click. Styling off the attribute leaves one.
            className={cn(
              "transition-colors",
              variant === "solid"
                ? cn(
                    "rounded-[7px] border-0 bg-transparent font-medium text-ink-soft hover:text-ink",
                    "aria-pressed:bg-surface-card aria-pressed:font-semibold aria-pressed:text-ink",
                    "aria-pressed:shadow-[0_1px_2px_rgba(8,7,8,0.12),0_0_0_1px_var(--border)]",
                    size === "sm" ? "h-8 px-3 text-[13px]" : "h-7 px-2.5 text-xs",
                  )
                : cn(
                    "rounded-full border border-transparent bg-transparent font-medium text-ink-soft hover:bg-surface-2 hover:text-ink",
                    "aria-pressed:border-copper aria-pressed:bg-copper-bg aria-pressed:font-semibold aria-pressed:text-copper-dark",
                    size === "sm" ? "h-7 px-2.5 text-xs" : "h-6 px-2 text-[11px]",
                  ),
            )}
          >
            {opt.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

/**
 * One segmented control described as data.
 *
 * Widgets that own several switchers (mode, board size, strategy) pass an array
 * of these down to whatever renders their header, rather than each one laying
 * out its own row of buttons.
 */
export interface SegmentedGroup<T extends string = string> {
  id: string;
  label: string;
  options: readonly SegmentedOption<T>[];
  active: T;
  onChange: (id: T) => void;
}

/** A header row of segmented controls, evenly spaced. */
export function SegmentedRow({ groups, className }: { groups: readonly SegmentedGroup[]; className?: string }) {
  if (groups.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-x-5 gap-y-2", className)}>
      {groups.map((g) => (
        <Segmented key={g.id} label={g.label} options={g.options} value={g.active} onChange={g.onChange} />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Buttons                                                                    */
/* -------------------------------------------------------------------------- */

const widgetButtonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
  {
    variants: {
      tone: {
        neutral: "border border-border-strong bg-surface-card text-ink hover:border-slate",
        primary: "border border-transparent bg-copper text-copper-ink hover:bg-copper-dark",
        danger: "border border-border-strong bg-surface-card text-signal-coral-strong hover:border-slate",
      },
      size: {
        xs: "rounded-md px-2 py-0.5 text-[10px]",
        sm: "h-8 rounded-lg px-3 text-xs",
        md: "h-9 rounded-[10px] px-4 text-[13px]",
      },
    },
    defaultVariants: { tone: "neutral", size: "sm" },
  },
);

/**
 * The small action button used inside widgets: reset, shuffle, new problem,
 * reveal answer.
 *
 * Deliberately separate from `components/ui/button`. That one is the shadcn
 * button and carries a focus ring, a translate-on-press and a size scale built
 * for page furniture; widget chrome wants something quieter that can sit beside
 * a canvas without competing with it.
 */
export function WidgetButton({
  className,
  tone,
  size,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof widgetButtonVariants>) {
  return <button type="button" className={cn(widgetButtonVariants({ tone, size }), className)} {...props} />;
}

/* -------------------------------------------------------------------------- */
/* Readouts                                                                   */
/* -------------------------------------------------------------------------- */

/** A boxed number with a caption, for comparison counts and swap counts. */
export function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "good" | "warn";
}) {
  // Beside the stage the column is already the frame, so the figure stands
  // on its own rather than in a tile.
  const unboxed = useContext(InSideColumnContext);
  return (
    <div className={unboxed ? "min-w-0" : "rounded-[10px] bg-surface-2 px-3.5 py-2.5"}>
      <div className="text-[11px] font-semibold text-slate">{label}</div>
      <div
        className={cn(
          "mt-0.5 font-mono text-[22px] font-bold leading-tight tabular-nums",
          tone === "good" && "text-signal-green",
          tone === "warn" && "text-copper-dark",
          tone === "default" && "text-ink",
        )}
      >
        {value}
      </div>
    </div>
  );
}

/** The unboxed variant, for stats that already sit inside a PanelBox. */
export function StatReadout({
  stats,
}: {
  stats: { label: string; value: string | number; tone?: "default" | "good" | "warn" }[];
}) {
  return (
    <div className="flex flex-wrap gap-x-[18px] gap-y-1.5 text-xs text-slate">
      {stats.map((s) => (
        <span key={s.label}>
          <b
            className={cn(
              "mr-1 text-[15px] font-bold tabular-nums",
              s.tone === "good" && "text-signal-green",
              s.tone === "warn" && "text-copper-dark",
              (!s.tone || s.tone === "default") && "text-ink",
            )}
          >
            {s.value}
          </b>
          {s.label}
        </span>
      ))}
    </div>
  );
}

/**
 * A quiet line of explanation under a visual: the "why" that a single-view
 * widget shows beside its prompt, not a message that comes and goes.
 */
export function StageNote({ children }: { children: ReactNode }) {
  return (
    <p className="mx-auto max-w-[36rem] text-center text-[13px] leading-relaxed text-ink-soft [&_code]:font-mono [&_code]:text-copper-dark">
      {children}
    </p>
  );
}

/** Inline feedback: a hint, a correct answer, a wrong answer. */
export function Banner({ tone, children }: { tone: "info" | "good" | "bad"; children: ReactNode }) {
  return (
    <p
      className={cn(
        "rounded-[10px] px-3.5 py-2.5 text-[13px] font-medium leading-relaxed",
        tone === "good" && "bg-signal-green-bg text-signal-green-strong",
        tone === "bad" && "bg-signal-coral-bg text-signal-coral-strong",
        tone === "info" && "bg-surface-2 text-ink-soft",
      )}
    >
      {children}
    </p>
  );
}

/* -------------------------------------------------------------------------- */
/* Containers                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * True inside the column a single-view shell draws beside its stage. The
 * card is already the frame there, so a panel drops its own box and becomes
 * a labelled section, and the shell does the spacing.
 */
export const InSideColumnContext = createContext(false);

/** Small labelled box used by the algorithm side panels. Unboxed beside a
 *  single-view stage (see InSideColumnContext). */
export function PanelBox({
  title,
  aside,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  /** A quieter note after the title, e.g. "first in, first out". */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Applied to the body wrapper - use a fixed `h-*` + `overflow-y-auto` here
   *  for a panel whose contents grow step to step (a visited list, a distance
   *  table) so the panel keeps one height for the whole run. */
  bodyClassName?: string;
}) {
  if (useContext(InSideColumnContext)) {
    return (
      <section className={cn("min-w-0", className)}>
        <h4 className="mb-2 flex items-baseline justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-slate">
          {title}
          {aside && <span className="font-medium normal-case tracking-normal">{aside}</span>}
        </h4>
        <div className={bodyClassName}>{children}</div>
      </section>
    );
  }
  return (
    <div className={cn("rounded-xl border border-border bg-surface-card p-3", className)}>
      <div className="mb-2.5 text-xs font-semibold text-ink-soft">
        {title}
        {aside && <span className="ml-1.5 font-normal text-slate">{aside}</span>}
      </div>
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}

/**
 * The one "why" sentence at the foot of a side column, under a hairline.
 * Outside that column it is a plain small paragraph.
 */
export function SideNote({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "bad" }) {
  return (
    <p
      className={cn(
        "mt-auto border-t border-border pt-3 text-xs leading-relaxed",
        tone === "bad" ? "text-signal-coral-strong [&_b]:text-signal-coral-strong" : "text-slate [&_b]:text-ink-soft",
      )}
    >
      {children}
    </p>
  );
}

/**
 * A labelled native select, for a secondary choice like "Example" that sits
 * on the stage's own header row. Native, so it works by keyboard, screen
 * reader and touch with no popover of our own.
 */
export function CompactSelect<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  const id = useId();
  return (
    <span className="inline-flex items-center gap-2">
      <label htmlFor={id} className="text-xs font-semibold text-slate">
        {label}
      </label>
      <span className="relative inline-flex">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          className="h-[30px] cursor-pointer appearance-none rounded-lg bg-surface-2 py-0 pl-2.5 pr-7 text-[13px] font-semibold text-ink transition-colors hover:bg-surface-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copper"
        >
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-slate" />
      </span>
    </span>
  );
}

/** One chip line's height (`py-1` + text), for reserving space below. */
const CHIP_ROW_LINE = "1.875rem";

/**
 * Horizontal row of chips, used for queues, stacks, call paths and candidate
 * sets.
 *
 * `reserveRows` locks the row to that many chip-lines tall (scrolling if it
 * overflows, and holding the height even while empty) so a queue that fills as
 * the algorithm runs never changes the widget's height.
 */
export function ChipRow({
  items,
  emptyLabel,
  tone = "copper",
  reserveRows,
}: {
  items: string[];
  emptyLabel: string;
  tone?: "copper" | "muted";
  reserveRows?: number;
}) {
  const reserve = reserveRows
    ? {
        minHeight: `calc(${reserveRows} * ${CHIP_ROW_LINE} + ${reserveRows - 1} * 0.375rem)`,
        maxHeight: `calc(${reserveRows} * ${CHIP_ROW_LINE} + ${reserveRows - 1} * 0.375rem)`,
      }
    : undefined;

  if (items.length === 0) {
    return (
      <div className="flex items-start" style={reserve}>
        <span className="text-xs italic text-slate">{emptyLabel}</span>
      </div>
    );
  }
  return (
    <div className={cn("flex flex-wrap gap-1.5", reserveRows && "overflow-y-auto")} style={reserve}>
      {items.map((item, i) => (
        <span
          key={`${item}-${i}`}
          className={cn(
            "inline-flex h-[1.875rem] min-w-[1.875rem] items-center justify-center rounded-lg px-2 text-[13px] font-bold",
            tone === "copper" ? "bg-copper-bg text-copper-dark" : "bg-surface-3 text-ink-soft",
          )}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

/**
 * A slot for a message that comes and goes - a hint, a correct/incorrect
 * banner, a "run hit the step limit" note. Renders nothing at all when there
 * is nothing to say, rather than reserving a fixed height up front: most of
 * these messages are rare (hitting a step limit, solving a board), so a
 * slot that's always "on" left a permanent blank gap at the bottom of every
 * widget that never fires it. Pass `lines` for how many lines of banner text
 * to reserve *while a message is showing*, so a multi-line banner doesn't
 * jump the moment it wraps.
 */
export function StatusSlot({
  children,
  lines = 2,
  className,
}: {
  children?: ReactNode;
  lines?: number;
  className?: string;
}) {
  if (!children) return null;
  return (
    <div
      className={cn(className)}
      style={{ minHeight: `calc(${lines} * 1.5em + 1rem)` }}
    >
      {children}
    </div>
  );
}

/**
 * A generic fixed-footprint scroll box, for a widget-specific region that
 * grows with interaction and doesn't fit ChipRow or PanelBox (a move log, a
 * state history).
 */
export function ReservedBox({
  height,
  children,
  className,
}: {
  /** A Tailwind height class, e.g. "h-24". */
  height: string;
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(height, "overflow-y-auto", className)}>{children}</div>;
}

/** The outer frame every widget shares, so the border and padding stay in step. */
export function WidgetFrame({
  children,
  frame = true,
  className,
}: {
  children: ReactNode;
  frame?: boolean;
  className?: string;
}) {
  return (
    <div className={cn(frame && "rounded-xl border border-border bg-surface-card p-5", className)}>{children}</div>
  );
}
