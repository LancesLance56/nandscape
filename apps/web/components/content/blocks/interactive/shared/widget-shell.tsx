"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Minimize2, PanelRight } from "lucide-react";
import { useIsEmbedded } from "@/components/embeds/embed-chrome";
import { cn } from "@/lib/cn";
import { Segmented, type SegmentedGroup } from "./widget-ui";

/**
 * The chrome every interactive widget renders inside, in two views.
 *
 * - **Focused** (the default): the one mode switch centred on top, the
 *   current narration promoted to a large prompt, the visual, a compact
 *   readout, and the dock. Side panels and secondary options are hidden.
 * - **Detailed** ("step-through"): eyebrow and title, the mode switch, a row of
 *   secondary options, the stage in a recessed well beside its side panels, a
 *   numbered narration line, and the dock.
 *
 * A small "Details" chip in the focused view's corner switches to detailed,
 * and a "Focused" chip in the detailed header switches back. Both views draw
 * from the same slots, so a widget describes its parts once and the shell
 * decides where they go. Widget state lives in the widget, above the shell,
 * so switching views keeps the reader's place.
 *
 * Designs: the "Nandscape Widget Redesign" canvas (Focused and Step-through
 * columns).
 */

export type WidgetView = "focused" | "detailed";

const WidgetViewContext = createContext<WidgetView>("detailed");

/** Which view the nearest shell is drawing. Outside a shell: "detailed". */
export function useWidgetView(): WidgetView {
  return useContext(WidgetViewContext);
}

const ViewStateContext = createContext<[WidgetView, (v: WidgetView) => void] | null>(null);

/**
 * Holds the view choice above a widget that swaps between whole sub-layouts
 * (N-Queens' "watch" and "place them yourself" each render their own shell).
 * Without it, switching mode would remount the shell and drop the reader back
 * into the focused view.
 */
export function KeepWidgetView({ children, defaultView = "focused" }: { children: ReactNode; defaultView?: WidgetView }) {
  const state = useState<WidgetView>(defaultView);
  return <ViewStateContext.Provider value={state}>{children}</ViewStateContext.Provider>;
}

/**
 * Splits a widget's switchers into the shell's two slots: the primary one
 * (shown in both views, as the solid track) and the rest (the detailed options
 * row, as text tabs). `extra` is appended to the options row.
 */
export function toggleSlots(groups: readonly SegmentedGroup[], primaryId?: string, extra?: ReactNode) {
  const primary = groups.find((g) => g.id === primaryId) ?? groups[0];
  const rest = groups.filter((g) => g !== primary);
  return {
    primary: primary ? (
      <Segmented variant="solid" options={primary.options} value={primary.active} onChange={primary.onChange} />
    ) : undefined,
    options:
      rest.length > 0 || extra ? (
        <>
          {rest.map((g) => (
            <OptionGroup key={g.id} label={g.label}>
              <Segmented options={g.options} value={g.active} onChange={g.onChange} />
            </OptionGroup>
          ))}
          {extra}
        </>
      ) : undefined,
  };
}

export interface WidgetShellProps {
  /** Eyebrow above the title in the detailed view, e.g. "Graphs". */
  kind: string;
  /** Detailed-view title, e.g. "Breadth-first search". */
  title: ReactNode;
  /** Extra text after the title in the detailed header, e.g. "Step 3 of 9". */
  meta?: ReactNode;
  /** The one control that picks what the widget shows. Both views. */
  primary?: ReactNode;
  /** Secondary choices (example, size, start node). Detailed view only. */
  options?: ReactNode;
  /** The visual. Both views. */
  stage: ReactNode;
  /** Panels beside the stage. Detailed view only. */
  side?: ReactNode;
  /** Width of the side column in the detailed view. */
  sideWidth?: number;
  /** Numbers drawn inline (StatReadout). Both views. */
  readout?: ReactNode;
  /** Colour key. Both views. */
  legend?: ReactNode;
  /** Narration: a numbered line in detailed, the big prompt in focused. */
  caption?: ReactNode;
  /** Badge beside the detailed narration, usually the step number. */
  captionLabel?: ReactNode;
  /** Focused-view prompt when it should differ from the caption. */
  prompt?: ReactNode;
  /** Messages that come and go (Banner). Both views, under the stage. */
  status?: ReactNode;
  /** The bottom bar: a PlayerDock, or a hint plus action buttons. */
  dock?: ReactNode;
  /** Content that only makes sense in the detailed view, after the well. */
  details?: ReactNode;
  /** Drop the card and the view switch, for hosts that draw their own box
   *  (the homepage bento). Always focused. */
  bare?: boolean;
  defaultView?: WidgetView;
  className?: string;
  /** Applied to the stage wrapper in both views. */
  stageClassName?: string;
}

export function WidgetShell(props: WidgetShellProps) {
  const embedded = useIsEmbedded();
  const outer = useContext(ViewStateContext);
  const local = useState<WidgetView>(props.defaultView ?? "focused");
  const [view, setView] = outer ?? local;
  const current = props.bare ? "focused" : view;

  return (
    <WidgetViewContext.Provider value={current}>
      <div
        data-widget-shell={current}
        className={cn(
          "not-prose relative flex flex-col text-ink",
          !props.bare && !embedded && "overflow-hidden rounded-[16.8px] border border-border bg-surface-card shadow-[var(--shadow-card)]",
          props.className,
        )}
      >
        {current === "focused" ? (
          <FocusedView {...props} onDetails={props.bare ? undefined : () => setView("detailed")} />
        ) : (
          <DetailedView {...props} onFocus={() => setView("focused")} />
        )}
      </div>
    </WidgetViewContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */

function FocusedView({
  primary,
  stage,
  readout,
  legend,
  caption,
  prompt,
  status,
  dock,
  stageClassName,
  bare,
  onDetails,
}: WidgetShellProps & { onDetails?: () => void }) {
  const text = prompt ?? caption;
  return (
    <>
      {(primary || onDetails) && (
        // One row: the switch centred, the chip at the end. A switch wider
        // than the card scrolls sideways rather than wrapping onto more rows,
        // because every extra row is height the reader pays on a laptop.
        <div className={cn("flex items-center gap-2 px-3 pt-2.5", bare && "px-0 pt-0")}>
          {onDetails && <span className="hidden w-[78px] shrink-0 sm:block" aria-hidden />}
          <div className="flex min-w-0 flex-1 justify-center">
            {primary && (
              <div className="max-w-full overflow-x-auto [scrollbar-width:none] [&_[data-slot=toggle-group]]:flex-nowrap [&_[data-slot=toggle-group-item]]:whitespace-nowrap">
                {primary}
              </div>
            )}
          </div>
          {onDetails && (
            <button
              type="button"
              onClick={onDetails}
              title="Open the detailed view"
              aria-label="Open the detailed view"
              className="inline-flex h-7 w-[78px] shrink-0 items-center justify-center gap-1.5 rounded-full border border-border bg-surface-card text-xs font-semibold text-slate transition-colors hover:border-border-strong hover:text-ink"
            >
              <PanelRight className="size-3.5" aria-hidden />
              Details
            </button>
          )}
        </div>
      )}

      <div className={cn("flex flex-1 flex-col items-center gap-3 px-3 pb-3 pt-2 sm:px-6", bare && "gap-2 px-0 pb-2")}>
        {text && (
          <div
            aria-live="polite"
            className={cn(
              "flex w-full max-w-[36rem] text-center tracking-[-0.01em] text-ink [&_code]:font-mono [&_code]:font-semibold [&_code]:text-copper-dark",
              // A stepped widget's narration changes every frame and runs long,
              // so it gets a fixed box (scrolling if it must) at a calmer size:
              // the widget never changes height while it plays. A fixed prompt
              // can afford to be large and set its own height.
              prompt === undefined
                ? bare
                  ? "h-[2.75rem] overflow-y-auto text-[13px] font-medium leading-snug"
                  : "h-[4.1rem] overflow-y-auto text-[15px] font-medium leading-snug"
                : bare
                  ? "text-sm font-semibold leading-snug"
                  : "items-center text-base font-semibold leading-snug sm:text-lg",
            )}
          >
            <p className="m-auto w-full">{text}</p>
          </div>
        )}
        <div className={cn("w-full min-w-0", stageClassName)}>{stage}</div>
        {!bare && (readout || legend) && (
          <div className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-2">
            {readout ?? <span />}
            {legend}
          </div>
        )}
        {status && <div className="w-full">{status}</div>}
      </div>

      {dock && <Dock bare={bare}>{dock}</Dock>}
    </>
  );
}

function DetailedView({
  kind,
  title,
  meta,
  primary,
  options,
  stage,
  side,
  sideWidth = 200,
  readout,
  legend,
  caption,
  captionLabel,
  status,
  dock,
  details,
  stageClassName,
  onFocus,
}: WidgetShellProps & { onFocus: () => void }) {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-2 px-4 pb-2.5 pt-3 sm:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-copper-dark">
            <i className="size-1.5 rounded-[2px] bg-copper" aria-hidden />
            {kind}
          </div>
          <h3 className="mt-0.5 text-base font-semibold tracking-[-0.01em] text-ink">
            {title}
            {meta && <span className="ml-2 text-xs font-medium text-slate">{meta}</span>}
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {primary}
          <button
            type="button"
            onClick={onFocus}
            title="Back to the focused view"
            aria-label="Back to the focused view"
            className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-surface-card pl-2 pr-2.5 text-xs font-semibold text-slate transition-colors hover:border-border-strong hover:text-ink"
          >
            <Minimize2 className="size-3.5" aria-hidden />
            Focused
          </button>
        </div>
      </div>

      {options && (
        // One sideways-scrolling line on a phone, where wrapping turned this
        // row into a stack of four or five.
        <div className="flex flex-nowrap items-center gap-x-5 gap-y-1.5 overflow-x-auto border-t border-border px-4 py-1.5 [scrollbar-width:none] sm:flex-wrap sm:px-5 [&>*]:shrink-0 [&_[data-slot=toggle-group]]:flex-nowrap sm:[&_[data-slot=toggle-group]]:flex-wrap">
          {options}
        </div>
      )}

      <div
        className={cn(
          "relative mx-2 rounded-xl border border-border bg-surface sm:mx-4",
          "bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:18px_18px]",
          !options && "mt-0.5",
        )}
      >
        {(readout || legend) && (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-3 pt-2">
            {readout ?? <span />}
            {legend}
          </div>
        )}
        <div
          className={cn("grid gap-3 p-2.5 sm:p-3", side && "md:grid-cols-[minmax(0,1fr)_var(--side-w)]")}
          style={side ? ({ "--side-w": `${sideWidth}px` } as React.CSSProperties) : undefined}
        >
          <div className={cn("min-w-0", stageClassName)}>{stage}</div>
          {side && (
            // The side column never makes the well taller than the stage: on
            // a wide screen it scrolls inside the stage's height, and on a
            // phone the panels sit in one sideways-scrolling row instead of a
            // tall stack under the stage.
            <div className="relative min-w-0">
              <div className="flex gap-2 overflow-x-auto pb-1 md:absolute md:inset-0 md:flex-col md:overflow-y-auto md:overflow-x-hidden md:pb-0 [&>*]:max-h-28 [&>*]:min-w-[200px] [&>*]:shrink-0 [&>*]:overflow-y-auto md:[&>*]:max-h-none md:[&>*]:min-w-0 md:[&>*]:overflow-visible">
                {side}
              </div>
            </div>
          )}
        </div>
      </div>

      {details && <div className="mx-2 mt-2.5 max-h-28 overflow-y-auto sm:mx-4 md:max-h-44">{details}</div>}
      {status && <div className="px-2 pt-2.5 sm:px-4">{status}</div>}

      {caption ? (
        <div className="flex h-[3.9rem] items-start gap-3 overflow-y-auto px-4 py-2.5 sm:px-5" aria-live="polite">
          {captionLabel !== undefined && (
            <span className="h-6 min-w-7 shrink-0 rounded-md bg-copper-bg px-1.5 text-center text-xs font-bold leading-6 tabular-nums text-copper-dark">
              {captionLabel}
            </span>
          )}
          <p className="mt-0.5 text-sm leading-[1.55] text-ink [&_code]:font-mono [&_code]:text-[13px] [&_code]:text-copper-dark">
            {caption}
          </p>
        </div>
      ) : (
        <div className="h-2.5" />
      )}

      {dock && <Dock>{dock}</Dock>}
    </>
  );
}

function Dock({ children, bare }: { children: ReactNode; bare?: boolean }) {
  return (
    <div
      className={cn(
        "@container mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border bg-surface-2 px-3 py-2 sm:px-4",
        bare && "rounded-lg border-t-0 px-2 py-1.5",
      )}
    >
      {children}
    </div>
  );
}

/** Renders its children only in the detailed view, e.g. a question that the
 *  focused view already shows as its prompt. */
export function DetailedOnly({ children }: { children: ReactNode }) {
  return useWidgetView() === "detailed" ? <>{children}</> : null;
}

/** Dock content for widgets without a transport: a hint left, buttons right. */
export function ActionDock({ hint, children }: { hint?: ReactNode; children?: ReactNode }) {
  return (
    <>
      {hint && <span className="text-[13px] text-ink-soft">{hint}</span>}
      {children && <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>}
    </>
  );
}

/** A labelled group for the detailed options row: "Size  8 | 14 | 32". */
export function OptionGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-slate">{label}</span>
      {children}
    </div>
  );
}

/** Colour key: a small square and a label per entry. */
export function Legend({ items }: { items: { color: string; label: string; outline?: boolean }[] }) {
  return (
    <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-ink-soft">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          <i
            className={cn("size-2.5 rounded-[3px]", it.outline && "border border-border-strong")}
            style={{ background: it.color }}
            aria-hidden
          />
          {it.label}
        </span>
      ))}
    </div>
  );
}
