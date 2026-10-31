"use client";

import { createContext, useContext, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ChevronDown, Minimize2, PanelRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { CompactSelect, InSideColumnContext, Segmented, type SegmentedGroup } from "./widget-ui";

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
 * A widget's mode switch as the shell's `tabs`, keeping the widget's own id
 * type for `onChange` (a `setMode` of a string union passes straight in).
 */
export function modeTabs<T extends string>(
  options: readonly { id: T; label: string; sub?: string; hint?: string; menu?: readonly { id: T; label: string }[] }[],
  value: T,
  onChange: (id: T) => void,
): WidgetTabs {
  return { options, value, onChange: (id) => onChange(id as T) };
}

/**
 * Splits a widget's switchers into the shell's two slots: the primary one
 * (shown in both views, as the folder tabs) and the rest (the detailed options
 * row, as text tabs). `extra` is appended to the options row.
 */
export function toggleSlots(groups: readonly SegmentedGroup[], primaryId?: string, extra?: ReactNode) {
  const primary = groups.find((g) => g.id === primaryId) ?? groups[0];
  const rest = groups.filter((g) => g !== primary);
  return {
    tabs: primary ? modeTabs(primary.options, primary.active, primary.onChange) : undefined,
    options:
      rest.length > 0 || extra ? (
        <>
          {rest.map((g) =>
            // A long list of pills costs a row of its own; a select costs one chip.
            g.options.length > 3 ? (
              <CompactSelect key={g.id} label={g.label} options={g.options} value={g.active} onChange={g.onChange} />
            ) : (
              <OptionGroup key={g.id} label={g.label}>
                <Segmented options={g.options} value={g.active} onChange={g.onChange} />
              </OptionGroup>
            ),
          )}
          {extra}
        </>
      ) : undefined,
  };
}

export interface WidgetTab {
  id: string;
  label: string;
  /** A quieter word after the label, e.g. "BFS" + "queue". */
  sub?: string;
  hint?: string;
  /**
   * Makes this tab a "More" menu: it opens a dropdown of these instead of
   * selecting itself, is the open tab whenever `value` is one of them, and
   * then shows that item's label in place of its own.
   */
  menu?: readonly { id: string; label: string }[];
}

export interface WidgetTabs {
  options: readonly WidgetTab[];
  value: string;
  onChange: (id: string) => void;
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
  /**
   * Modes drawn as folder tabs standing on the card's top edge, instead of a
   * switch inside it: the open tab is the card's own nib, and the row costs
   * the card no height. Prefer this over a Segmented `primary` for a mode
   * switch. In a `bare` shell it falls back to that Segmented.
   */
  tabs?: WidgetTabs;
  /** Secondary choices (example, size, start node). Detailed view, or the
   *  stage's header row in a single view with `side`. */
  options?: ReactNode;
  /** The visual. Both views. */
  stage: ReactNode;
  /**
   * Panels beside the stage. Detailed view, or - in a single view - an
   * unboxed column beside the stage, where `PanelBox` becomes a labelled
   * section (the "Focused v2" boards on the redesign canvas).
   */
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
  /**
   * One view only, with no Details chip: for a widget whose focused view
   * already shows everything. The chip is meant to go away everywhere; this
   * is how a widget opts out once it no longer needs a second view.
   */
  singleView?: boolean;
  /**
   * More air above and below the content, for a widget that is a prompt and
   * a short list (a quiz) rather than a visual that fills the card.
   */
  roomy?: boolean;
  defaultView?: WidgetView;
  className?: string;
  /** Applied to the stage wrapper in both views. */
  stageClassName?: string;
}

export function WidgetShell(props: WidgetShellProps) {
  const outer = useContext(ViewStateContext);
  const local = useState<WidgetView>(props.defaultView ?? "focused");
  const [view, setView] = outer ?? local;
  const current = props.bare || props.singleView ? "focused" : view;
  const switchable = !props.bare && !props.singleView;
  const panelId = useId();

  // A bare shell has no card for a tab to belong to, so its modes go back to
  // being the switch on top.
  const { tabs: tabsProp, ...rest } = props;
  const tabs = props.bare ? undefined : tabsProp;
  const slots: WidgetShellProps =
    props.bare && tabsProp
      ? {
          ...rest,
          primary: (
            <Segmented
              variant="solid"
              // A "More" tab has nothing to hide behind here: its items join the row.
              options={tabsProp.options.flatMap((o) => o.menu ?? [{ id: o.id, label: o.label }])}
              value={tabsProp.value}
              onChange={tabsProp.onChange}
            />
          ),
        }
      : rest;

  const toDetailed = () => setView("detailed");
  const toFocused = () => setView("focused");
  const firstOpen = tabs ? tabIsOpen(tabs.options[0], tabs.value) : false;

  const card = (
    <div
      id={tabs ? panelId : undefined}
      role={tabs ? "tabpanel" : undefined}
      data-widget-shell={current}
      className={cn(
        "not-prose relative flex flex-col text-ink",
        // Drawn inside an embed too: the card is the frame the folder tabs
        // stand on, and the embed preview no longer wraps it in a box of its own.
        !props.bare && "overflow-hidden rounded-[16.8px] border border-border bg-surface-card shadow-[var(--shadow-card)]",
        // The first tab stands on this corner, so it is square under it.
        firstOpen && "rounded-tl-none",
        !tabs && props.className,
      )}
    >
      {/* With tabs, the view chip lives on the tab row instead. */}
      {current === "focused" ? (
        props.singleView && props.side && !props.bare ? (
          <SplitView {...slots} />
        ) : (
          <FocusedView {...slots} onDetails={!switchable || tabs ? undefined : toDetailed} />
        )
      ) : (
        <DetailedView {...slots} onFocus={tabs ? undefined : toFocused} />
      )}
    </div>
  );

  return (
    <WidgetViewContext.Provider value={current}>
      {tabs ? (
        <div className={cn("not-prose flex flex-col", props.className)}>
          <FolderTabs
            tabs={tabs}
            panelId={panelId}
            end={
              !switchable ? null : current === "focused" ? (
                <DetailsChip onClick={toDetailed} />
              ) : (
                <FocusedChip onClick={toFocused} />
              )
            }
          />
          <div className="relative">
            {/* With a later tab open, the first tab's grey nib still stands on
                the corner, so its colour shows through the card's rounded
                top-left instead of a notch of page. */}
            {!firstOpen && (
              <span aria-hidden className="absolute left-0 top-0 size-[17px] border-l border-border bg-surface-2" />
            )}
            {card}
          </div>
        </div>
      ) : (
        card
      )}
    </WidgetViewContext.Provider>
  );
}

/** A tab is open when it is the value, or (a "More" tab) holds the value. */
function tabIsOpen(tab: WidgetTab | undefined, value: string): boolean {
  if (!tab) return false;
  return tab.menu ? tab.menu.some((m) => m.id === value) : tab.id === value;
}

/**
 * The modes as folder nibs: short, wide, sloped at the sides, each tucked
 * slightly behind its neighbour. The open one sits in front in the card's own
 * colour and drops a pixel over the card's border, so tab and card read as
 * one folder.
 *
 * The slope is an inner layer tilted back in perspective, which turns a
 * rounded rectangle into a rounded trapezoid; the button itself stays a plain
 * box, so its hit area and focus ring are ordinary.
 */
function FolderTabs({ tabs, panelId, end }: { tabs: WidgetTabs; panelId: string; end: ReactNode }) {
  const refs = useRef<(HTMLButtonElement | HTMLSelectElement | null)[]>([]);
  const index = Math.max(
    0,
    tabs.options.findIndex((o) => tabIsOpen(o, tabs.value)),
  );

  // Arrow keys move between tabs, as the tabs pattern expects. Landing on a
  // "More" tab opens its first item; inside its dropdown the arrows are the
  // dropdown's own.
  const onKeyDown = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement).tagName === "SELECT") return;
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (index + step + tabs.options.length) % tabs.options.length;
    const target = tabs.options[next];
    tabs.onChange(target.menu ? (target.menu[0]?.id ?? target.id) : target.id);
    refs.current[next]?.focus();
  };

  return (
    <div className="flex items-end gap-2">
      <div role="tablist" onKeyDown={onKeyDown} className="flex min-w-0 items-end pl-0.5">
        {tabs.options.map((o, i) => {
          const on = i === index;
          // Earlier tabs stack above later ones, the open one above all.
          const style = { zIndex: on ? tabs.options.length + 1 : tabs.options.length - i };
          const className = cn(
            "group/tab relative isolate -mr-2.5 inline-flex min-w-0 shrink items-baseline gap-1.5 whitespace-nowrap px-5 text-[13px] font-semibold transition-colors sm:min-w-28 sm:px-[26px]",
            "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-copper has-[select:focus-visible]:outline-2 has-[select:focus-visible]:-outline-offset-2 has-[select:focus-visible]:outline-copper",
            on ? "-mb-px h-[38px] leading-[38px] text-ink" : "h-[34px] leading-[34px] text-ink-soft hover:text-ink",
          );
          const nib = (
            <span
              aria-hidden
              className={cn(
                "absolute inset-0 -z-10 origin-bottom rounded-t-[9px] border border-b-0 border-border [transform:perspective(60px)_rotateX(14deg)]",
                on ? "bg-surface-card shadow-[inset_0_2px_0_var(--copper)]" : "bg-surface-2 group-hover/tab:bg-surface-3",
              )}
            />
          );

          if (o.menu) {
            // A native <select> laid invisibly over the nib: the platform's
            // own dropdown, so it works by keyboard, screen reader and touch
            // without a popover of our own. It lists the menu's items, plus
            // the tab's own label as a placeholder while none of them is open.
            const picked = o.menu.find((m) => m.id === tabs.value);
            return (
              <span key={o.id} style={style} className={className} title={o.hint}>
                {nib}
                <span className="truncate">{picked?.label ?? o.label}</span>
                <ChevronDown aria-hidden className="size-3 shrink-0 self-center text-slate" />
                <select
                  ref={(el) => {
                    refs.current[i] = el;
                  }}
                  aria-label={o.label}
                  tabIndex={on ? 0 : -1}
                  value={picked?.id ?? ""}
                  onChange={(e) => e.target.value && tabs.onChange(e.target.value)}
                  className="absolute inset-0 cursor-pointer opacity-0"
                >
                  {!picked && (
                    <option value="" disabled>
                      {o.label}
                    </option>
                  )}
                  {o.menu.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </span>
            );
          }

          return (
            <button
              key={o.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls={panelId}
              tabIndex={on ? 0 : -1}
              title={o.hint}
              onClick={() => tabs.onChange(o.id)}
              style={style}
              className={className}
            >
              {nib}
              <span className="truncate">{o.label}</span>
              {o.sub && <span className="hidden text-[11px] font-medium text-slate sm:inline">{o.sub}</span>}
            </button>
          );
        })}
      </div>
      <div className="mb-1.5 ml-auto shrink-0">{end}</div>
    </div>
  );
}

function DetailsChip({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Open the detailed view"
      aria-label="Open the detailed view"
      className="inline-flex h-7 items-center justify-center gap-1.5 rounded-full border border-border bg-surface-card px-2.5 text-xs font-semibold text-slate transition-colors hover:border-border-strong hover:text-ink"
    >
      <PanelRight className="size-3.5" aria-hidden />
      Details
    </button>
  );
}

function FocusedChip({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Back to the focused view"
      aria-label="Back to the focused view"
      className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-surface-card pl-2 pr-2.5 text-xs font-semibold text-slate transition-colors hover:border-border-strong hover:text-ink"
    >
      <Minimize2 className="size-3.5" aria-hidden />
      Focused
    </button>
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
  roomy,
  onDetails,
}: WidgetShellProps & { onDetails?: () => void }) {
  const text = prompt ?? caption;
  const narration = (
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
  );
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

      <div
        className={cn(
          "flex flex-1 flex-col items-center gap-3 px-3 pb-3 pt-2 sm:px-6",
          // No switch row above (a tabbed shell): the prompt is the first
          // thing in the card and needs the breathing room the row gave it.
          !primary && !onDetails && "pt-4 sm:pt-5",
          roomy && "gap-4 pb-7 pt-6 sm:pb-9 sm:pt-8",
          bare && "gap-2 px-0 pb-2 pt-2 sm:pt-2",
        )}
      >
        {text && narration}
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

/**
 * A single view with nothing left behind a Details chip: the narration on
 * top, then the stage with its choices and counts on a header row and its key
 * underneath, and beside it the side panels as one unboxed column that never
 * makes the card taller than the stage (on a phone, one sideways row under
 * it). Every slot the detailed view used is here, so the chip has no reason
 * to exist.
 */
function SplitView({
  primary,
  options,
  stage,
  side,
  sideWidth = 248,
  readout,
  legend,
  caption,
  prompt,
  status,
  dock,
  stageClassName,
}: WidgetShellProps) {
  const text = prompt ?? caption;
  return (
    <>
      {primary && <div className="flex justify-center px-3 pt-2.5">{primary}</div>}
      <div className="flex flex-1 flex-col gap-3 px-4 pb-4 pt-4 sm:px-6 sm:pt-5">
        {text && (
          <div
            aria-live="polite"
            className={cn(
              "max-w-[46rem] tracking-[-0.01em] text-ink [&_code]:font-mono [&_code]:font-semibold [&_code]:text-copper-dark",
              // A stepped narration changes every frame: a fixed box, so the
              // card never changes height while it plays.
              prompt === undefined
                ? "h-[3.25rem] overflow-y-auto text-[15px] font-semibold leading-snug"
                : "text-base font-semibold leading-snug",
            )}
          >
            <p>{text}</p>
          </div>
        )}
        {/* The side column is taken out of flow so its changing contents never
            resize the card, which leaves the stage setting the height. A floor
            keeps a short stage (a one-row table) from squeezing the column
            into a scroll strip. */}
        <div
          className="grid gap-x-7 gap-y-4 md:min-h-[20rem] md:grid-cols-[minmax(0,1fr)_var(--side-w)]"
          style={{ "--side-w": `${sideWidth}px` } as React.CSSProperties}
        >
          <div className="flex min-w-0 flex-col">
            {(options || readout) && (
              <div className="mb-3 flex flex-wrap items-center gap-x-[18px] gap-y-2 [&_[data-slot=toggle-group]]:flex-nowrap">
                {options}
                {readout && <div className="ml-auto">{readout}</div>}
              </div>
            )}
            <div className={cn("min-w-0", stageClassName)}>{stage}</div>
            {legend && <div className="mt-auto pt-3">{legend}</div>}
            {status && <div className="pt-3">{status}</div>}
          </div>
          <InSideColumnContext.Provider value>
            <div className="relative min-w-0">
              <div className="flex gap-x-5 gap-y-[18px] overflow-x-auto pb-1 [scrollbar-width:thin] md:absolute md:inset-0 md:flex-col md:overflow-y-auto md:overflow-x-hidden md:pb-0 [&>*]:w-[210px] [&>*]:shrink-0 md:[&>*]:w-auto">
                {side}
              </div>
            </div>
          </InSideColumnContext.Provider>
        </div>
      </div>
      {dock && <Dock>{dock}</Dock>}
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
  roomy,
  onFocus,
}: WidgetShellProps & { onFocus?: () => void }) {
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
          {onFocus && <FocusedChip onClick={onFocus} />}
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
          className={cn(
            "grid gap-3 p-2.5 sm:p-3",
            roomy && "px-3 py-6 sm:px-5 sm:py-7",
            side && "md:grid-cols-[minmax(0,1fr)_var(--side-w)]",
          )}
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
