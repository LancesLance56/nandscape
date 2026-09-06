"use client";

/**
 * How the tool works, in the tool.
 *
 * Mostly about lines, because that is where this editor differs from the ones
 * people arrive from: nothing routes a connector for you, which is a promise
 * rather than a limitation, and it needs saying once plainly.
 */

import { useEffect } from "react";
import { X } from "lucide-react";

const DRAWING: [string, string][] = [
  ["Hover a shape", "Connection dots appear around it"],
  ["Drag from a dot", "Draws a connector; drop it on another shape to attach"],
  ["Drop on empty page", "Offers your recent symbols, and wires the new one up"],
  ["Line tool, then click", "Starts a connector that stays in flight"],
  ["Click again", "Places a bend exactly where you clicked"],
  ["Click a shape", "Ends the connector there"],
  ["Double-click / Enter", "Ends the connector where it is"],
  ["Backspace", "Takes back the last bend"],
  ["Escape", "Abandons the connector"],
  ["Shift while drawing", "Holds the segment to 45° (or to the axis, on a connector)"],
];

const EDITING: [string, string][] = [
  ["Double-click a shape", "Edit its text in place"],
  ["Drag a square handle", "Move a connector's end; drop it on a shape to re-attach"],
  ["Drag a diamond handle", "Move one bend"],
  ["Drag a round handle", "Slide a whole segment sideways"],
  ["Double-click a bend", "Remove it"],
  ["Drag a shape", "Attached ends follow; every bend you placed stays put"],
];

const KEYS: [string, string][] = [
  ["Ctrl/Cmd + Z", "Undo"],
  ["Ctrl/Cmd + Shift + Z", "Redo"],
  ["Ctrl/Cmd + C / X / V", "Copy, cut, paste"],
  ["Ctrl/Cmd + D", "Duplicate"],
  ["Ctrl/Cmd + A", "Select all"],
  ["Ctrl/Cmd + G", "Group / Shift to ungroup"],
  ["Delete", "Remove the selection"],
  ["Arrow keys", "Nudge by 1px, or 10px with Shift"],
  ["Ctrl/Cmd + wheel", "Zoom"],
  ["Middle-drag / Space", "Pan"],
];

export function HelpDrawer({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Flowchart editor help"
      className="fixed inset-0 z-[100] flex justify-end bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-fe-line bg-fe-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 flex items-center gap-2 border-b border-fe-line bg-fe-panel px-4 py-3">
          <h2 className="text-sm font-bold text-fe-ink">How this works</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close help"
            className="ml-auto rounded p-1 text-fe-muted hover:bg-fe-hover hover:text-fe-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex flex-col gap-6 px-4 py-4">
          <section>
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-fe-muted">
              Lines are yours
            </h3>
            <p className="text-xs leading-relaxed text-fe-ink">
              Nothing in this editor routes a connector. A line is the exact polyline you drew: the point
              you started from, every bend you clicked, the point you finished on. Move a shape and an
              attached end slides along with it, but the bends stay where you put them. A drawing you
              leave today opens tomorrow looking the same, which is the whole reason to do it this way.
            </p>
          </section>

          <Section title="Drawing a line" rows={DRAWING} />
          <Section title="Changing one" rows={EDITING} />
          <Section title="Keyboard" rows={KEYS} />

          <section>
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-fe-muted">Symbols</h3>
            <p className="text-xs leading-relaxed text-fe-ink">
              The shapes follow ANSI and ISO 5807: a pill is a terminator, a rectangle a process, a
              diamond a decision, a parallelogram data in or out, a rectangle with bars a predefined
              process. Click a symbol in the panel to arm it and click the page to place one, or drag it
              straight onto the page.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <section>
      <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-fe-muted">{title}</h3>
      <dl className="flex flex-col gap-1.5">
        {rows.map(([keys, what]) => (
          <div key={keys} className="flex items-baseline gap-3">
            <dt className="w-44 shrink-0">
              <kbd className="rounded border border-fe-line bg-fe-panel-2 px-1.5 py-0.5 text-[10px] font-medium text-fe-ink">
                {keys}
              </kbd>
            </dt>
            <dd className="text-[11px] leading-relaxed text-fe-muted">{what}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
