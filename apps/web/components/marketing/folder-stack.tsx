"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import useSound from "use-sound";
import { cn } from "@/lib/cn";

/**
 * The tutorials block as a drawer of folders.
 *
 * Geometry is the whole trick here. Every folder is the *same* absolutely
 * positioned box at `top = fi * STEP`, so nothing in the stack is laid out
 * relative to anything else: hovering, opening and closing only ever change a
 * `translateY`, which the compositor animates without touching layout. The one
 * exception is the wrapper's height, which grows while a folder is open so the
 * rest of the page moves out of the way on the same curve.
 *
 * Only the top corners are rounded. A folder is a sheet folded along its
 * bottom edge, so that edge is straight; rounding it turned the stack into a
 * stack of cards. Paint order is front-of-the-drawer-wins (`zIndex: fi`), i.e.
 * the folder lowest on screen is nearest the viewer. Each folder is its own stacking
 * context, so its shoulder tabs - which sit *behind* the folder's own face -
 * can never poke through the folders in front of it.
 *
 * An open folder slides a sheet of ruled notebook paper up out of itself:
 * punched holes, a margin rule, and its sections and lessons written on the
 * lines. The ruling *is* the layout - `LINE` is both the pitch of the printed
 * rules and the height of every row, and a folder is exactly as tall as the
 * number of lines it needs, so nothing ever has to crop or scroll.
 *
 * A folder keeps its tint whatever it is doing. Opening one is said with
 * movement and with the sheet coming out, never with colour, so the stack
 * never flashes.
 *
 * The sheet keeps its own light palette (--paper-*) in both themes, because a
 * sheet that went dark with the rest of the page would stop reading as paper.
 */

export interface FolderLesson {
  title: string;
  href: string;
}

export interface FolderTab {
  slug: string;
  /** Short label shown on the tab. */
  name: string;
  /** The section's real title, written on the paper. */
  title: string;
  /** Every lesson in the section, not just the previewed ones. */
  count: number;
  href: string;
  /** The opening lessons - a handful, not the whole section. */
  lessons: FolderLesson[];
}

export interface Folder {
  id: string;
  label: string;
  blurb: string;
  count: number;
  tabs: FolderTab[];
}

/** Strip of a folder left showing by the one in front of it. */
const STEP = 62;
/** Height of a closed folder - the tabs do the labelling, so this is a sliver. */
const FACE = 84;
/** Where the sheet sits inside the folder, and the folder left under it. */
const PAPER_TOP = 42;
const PAPER_BOTTOM = 16;

/** The ruling: one printed rule, and one row of writing, every LINE pixels. */
const LINE = 21;
/** Unruled strip at the head of the sheet. */
const PAPER_PAD = 10;
/** Lines the blurb is written across; the coloured header rule closes it. */
const BLURB_LINES = 1;
/** Blank lines at the foot. The folder in front eats into these, so the page
 *  runs on under it instead of stopping at a tidy edge. */
const TAIL_LINES = 2;

/** Headroom for the shoulder tabs and the lift. */
const TOP_PAD = 34;
const HOVER_LIFT = 10;
const OPEN_LIFT = 12;

/** Punched holes: this far apart, centred, as many as the sheet has room for.
 *  A long page gets more of them rather than three stretched out. */
const HOLE_PITCH = 54;
const HOLE_MARGIN = 12;

/** How much of an open folder the next one covers: the folder's bottom margin,
 *  the height it lifts by, and then a line and a half of the sheet itself - so
 *  the page is cut mid-line and reads as running on underneath. */
const CROP = PAPER_BOTTOM + OPEN_LIFT + Math.round(LINE * 1.6);

/** One long, soft ease for every motion in the stack, so it reads as one object. */
const MOVE = "duration-[520ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none";

/** A row of writing: exactly one ruled line tall, text sitting on the rule. */
const ROW = "flex items-center gap-2 overflow-hidden";

/** Folder stock, cycled down the stack so neighbours never share a tint. */
const TINTS = ["var(--folder-1)", "var(--folder-2)", "var(--folder-3)", "var(--folder-4)"];

/** Lines of writing a folder needs: the blurb, then one per section and one
 *  per previewed lesson. */
function paperHeight(folder: Folder): number {
  const lines = folder.tabs.reduce((n, tab) => n + 1 + tab.lessons.length, BLURB_LINES);
  return PAPER_PAD + (lines + TAIL_LINES) * LINE;
}

/** An open folder is exactly its sheet plus an even margin. */
function bodyHeight(folder: Folder): number {
  return PAPER_TOP + paperHeight(folder) + PAPER_BOTTOM;
}

/**
 * The shuffle. Nudging a folder in the drawer makes a soft paper sound, so
 * hovering one plays a short slice of a real paper-handling recording
 * (bigsoundbank.com "Road map #1", CC0, in public/sounds/). `use-sound` loads
 * Howler on the first play and handles the browser's autoplay unlock. Seven
 * windows into the ~6s clip, one picked at random per hover, so a sweep down
 * the stack reads as shuffling rather than one sample on repeat. Silent for
 * reduced-motion.
 *
 * Pitch jitter would be the obvious next touch, but `use-sound` v5 calls
 * Howler's `rate()` on the no-id path when you pass `playbackRate` to `play()`,
 * and that throws when a sprite is defined, so the variety comes from the
 * windows alone.
 */
const SHUFFLE_SRC = "/sounds/paper-shuffle.mp3";

/** [start, length] in ms into the ~6s clip. */
const SHUFFLE_SPRITE: Record<string, [number, number]> = {
  a: [120, 340],
  b: [900, 320],
  c: [1700, 340],
  d: [2600, 320],
  e: [3400, 340],
  f: [4300, 340],
  g: [5100, 320],
};
const SHUFFLE_IDS = Object.keys(SHUFFLE_SPRITE);

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function FolderStack({ folders }: { folders: Folder[] }) {
  const [openId, setOpenId] = useState<string | null>(folders[0]?.id ?? null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const [playShuffle] = useSound(SHUFFLE_SRC, {
    volume: 0.28,
    sprite: SHUFFLE_SPRITE,
    interrupt: true,
  });

  const shuffle = () => {
    if (prefersReducedMotion()) return;
    playShuffle({ id: SHUFFLE_IDS[Math.floor(Math.random() * SHUFFLE_IDS.length)] });
  };

  const n = folders.length;
  if (n === 0) return null;

  const openIndex = folders.findIndex((f) => f.id === openId);
  const isAnyOpen = openIndex >= 0;
  const openBody = isAnyOpen ? bodyHeight(folders[openIndex]) : 0;
  /** Where folder `fi` is pushed to. Lifts are ignored - they only go up. */
  const slide = (fi: number) =>
    isAnyOpen && fi > openIndex ? Math.max(0, openBody - CROP - STEP) : 0;
  // The stack is as tall as its lowest folder bottom, so the rest of the page
  // rides the same curve as the folder that opened.
  const height = Math.max(
    ...folders.map((_, fi) => TOP_PAD + fi * STEP + slide(fi) + (fi === openIndex ? openBody : FACE)),
  );

  return (
    <div className={cn("relative w-full transition-[height]", MOVE)} style={{ height }}>
      {folders.map((folder, fi) => {
        const isOpen = fi === openIndex;
        const isHover = hoverId === folder.id;
        const panelId = `folder-panel-${folder.id}`;

        const shift = slide(fi) + (isOpen ? -OPEN_LIFT : isHover ? -HOVER_LIFT : 0);
        const face = TINTS[fi % TINTS.length];
        const paperH = paperHeight(folder);
        // As many holes as fit at the standard pitch, centred on the sheet, so
        // spacing is identical folder to folder and only the count changes.
        const holes = Math.max(2, Math.floor((paperH - 2 * HOLE_MARGIN) / HOLE_PITCH) + 1);
        const holeTop = (paperH - (holes - 1) * HOLE_PITCH) / 2;

        return (
          <div
            key={folder.id}
            className={cn("absolute inset-x-0 transition-[transform,height]", MOVE)}
            style={{
              top: TOP_PAD + fi * STEP,
              height: isOpen ? bodyHeight(folder) : FACE,
              zIndex: fi,
              transform: `translate3d(0, ${shift}px, 0)`,
            }}
            onPointerEnter={() => {
              setHoverId(folder.id);
              shuffle();
            }}
            onPointerLeave={() => setHoverId((id) => (id === folder.id ? null : id))}
            onFocusCapture={() => setHoverId(folder.id)}
            onBlurCapture={() => setHoverId((id) => (id === folder.id ? null : id))}
          >
            {/* Shoulder tabs. Same fill as the face and painted *underneath* it,
                so the join is invisible and a tab can only ever overlap the
                folder behind this one - never the folders in front. */}
            <div className="absolute -top-[22px] left-5 right-5 z-0 flex gap-1.5 sm:left-7 sm:right-7">
              {folder.tabs.map((tab) => (
                <span
                  key={tab.slug}
                  className="min-w-0 truncate rounded-t-[10px] px-3 pb-5 pt-1.5 text-[11px] font-medium tracking-wide text-ink-soft"

                  style={{ background: face }}
                >
                  {tab.name}
                </span>
              ))}
            </div>

            {/* The face. */}
            <div
              className="absolute inset-0 z-10 overflow-hidden rounded-t-2xl transition-[box-shadow,background-color] duration-300"
              style={{
                background: face,
                boxShadow: isOpen
                  ? "0 -10px 26px -14px rgba(20,27,20,0.28), 0 26px 50px -30px rgba(20,27,20,0.5)"
                  : isHover
                    ? "0 -10px 24px -14px rgba(20,27,20,0.26), 0 20px 40px -26px rgba(20,27,20,0.5)"
                    : "0 -8px 20px -14px rgba(20,27,20,0.22)",
              }}
            >
              {/* Full-face hit area, under everything, so anywhere on a closed
                  folder opens it. */}
              <button
                type="button"
                onClick={() => {
                  shuffle();
                  setOpenId(isOpen ? null : folder.id);
                }}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="absolute inset-0 z-0 cursor-pointer rounded-t-2xl focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-copper"
              >
                <span className="sr-only">{folder.label}</span>
              </button>

              {/* The strip of folder you can always see. The tabs name it, so
                  all this carries is the count and the open/shut cue. */}
              <div className="pointer-events-none relative z-10 flex items-center justify-end gap-2.5 px-5 pt-3 sm:px-7">
                <span className="font-mono text-[11px] tabular-nums text-slate">
                  {folder.count} {folder.count === 1 ? "lesson" : "lessons"}
                </span>
                <ChevronDown
                  className={cn("h-3.5 w-3.5 shrink-0 text-slate transition-transform", MOVE, isOpen && "rotate-180")}
                />
              </div>

              {/* The sheaf. The wrapper does the sliding; inside it two blank
                  sheets sit under the written one, so an open folder shows
                  paper it has not spent yet. */}
              <div
                id={panelId}
                aria-hidden={!isOpen}
                className={cn("absolute z-10 transition-[transform,opacity]", MOVE, !isOpen && "pointer-events-none")}
                style={{
                  top: PAPER_TOP,
                  height: paperH,
                  left: 22,
                  right: 22,
                  transform: isOpen ? "translate3d(0,0,0)" : `translate3d(0, ${FACE - PAPER_TOP}px, 0)`,
                  opacity: isOpen ? 1 : 0,
                  transitionDelay: isOpen ? "60ms" : "0ms",
                }}
              >
                <div
                  className="absolute inset-0 overflow-hidden rounded-[3px]"
                  style={{
                    background:
                      "linear-gradient(178deg, var(--paper) 0%, color-mix(in oklab, var(--copper) 5%, var(--paper)) 100%)",
                    boxShadow:
                      "0 1px 1px rgba(20,27,20,0.06), 0 14px 30px -20px rgba(20,27,20,0.45), inset 0 1px 0 rgba(255,255,255,0.55)",
                  }}
                >
                  {/* The ruling, printed on the same LINE the rows are laid out
                      on, so every row of writing sits on a rule. */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 bottom-0"
                    style={{
                      top: PAPER_PAD,
                      background: `repeating-linear-gradient(to bottom, transparent 0 ${LINE - 1}px, color-mix(in oklab, var(--paper-line) 85%, transparent) ${LINE - 1}px ${LINE}px)`,
                    }}
                  />

                  {/* The two lines a notebook prints in colour: the header rule
                      under the blurb, and the margin down the left. */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 h-px bg-paper-accent/40"
                    style={{ top: PAPER_PAD + BLURB_LINES * LINE - 1 }}
                  />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 left-[30px] w-px bg-paper-accent/30 sm:left-[38px]"
                  />

                  {/* Punched holes, with the folder itself showing through.
                      Spaced in pixels, not per cent, so they line up across
                      folders of different lengths. */}
                  {Array.from({ length: holes }, (_, k) => (
                    <span
                      key={k}
                      aria-hidden
                      className="pointer-events-none absolute left-[10px] h-2 w-2 -translate-y-1/2 rounded-full shadow-[inset_0_1px_2px_rgba(20,27,20,0.45)] sm:left-[13px] sm:h-[9px] sm:w-[9px]"
                      style={{ top: holeTop + k * HOLE_PITCH, background: face }}
                    />
                  ))}

                  <div className="absolute inset-x-0 pl-10 pr-4 pt-5.5 sm:pl-12.5 sm:pr-6" style={{ top: PAPER_PAD }}>
                    { /* Looks a bit weird
                    <p
                      className="truncate text-[12px] text-paper-ink-soft"
                      style={{ lineHeight: `${LINE}px`, height: BLURB_LINES * LINE }}
                    >
                      {folder.blurb}
                    </p> */ }

                    {folder.tabs.map((tab) => {
                      const rest = tab.count - tab.lessons.length;

                      return (
                        <div key={tab.slug}>
                          {/* The section, written across the whole line. */}
                          <Link
                            href={tab.href}
                            tabIndex={isOpen ? undefined : -1}
                            className={cn(ROW, "group/section justify-between")}
                            style={{ height: LINE }}
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="h-1 w-1 shrink-0 rounded-full bg-paper-accent transition-transform duration-300 group-hover/section:scale-150 motion-reduce:transition-none" />
                              <span className="truncate text-[13px] font-semibold text-paper-ink transition-colors duration-200 group-hover/section:text-paper-accent">
                                {tab.title}
                              </span>
                            </span>
                            <span className="shrink-0 font-mono text-[10px] tabular-nums text-paper-muted transition-colors duration-200 group-hover/section:text-paper-accent">
                              {rest > 0
                                ? `+${rest} more ${rest === 1 ? "lesson" : "lessons"}`
                                : `${tab.count} ${tab.count === 1 ? "lesson" : "lessons"}`}
                              {" →"}
                            </span>
                          </Link>

                          {/* Its opening lessons, indented underneath. */}
                          {tab.lessons.map((lesson, li) => (
                            <Link
                              key={lesson.href}
                              href={lesson.href}
                              tabIndex={isOpen ? undefined : -1}
                              className={cn(ROW, "group/lesson pl-3")}
                              style={{ height: LINE }}
                            >
                              <span className="w-3 shrink-0 font-mono text-[9px] tabular-nums text-paper-accent/55">
                                {li + 1}
                              </span>
                              <span className="truncate text-[12px] text-paper-ink-soft transition-colors duration-200 group-hover/lesson:text-paper-accent">
                                {lesson.title}
                              </span>
                            </Link>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
