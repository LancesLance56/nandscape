"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, FilePlus2, HelpCircle, X } from "lucide-react";

import { cn } from "@/lib/cn";
import { Logo } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { ALL_CHARTS, CHART_GROUPS, STARTER_CHART } from "@/lib/flowchart/charts";
import { EMPTY_CHART, deepClone } from "@/lib/flowchart/edit";
import { isFlowchartSpec, type FlowchartSpec } from "@/lib/flowchart/types";
import { Btn, Kbd } from "./controls";
import { FlowchartWorkbench } from "./workbench";
import { useFlowchartDoc } from "./use-flowchart-doc";

const DRAFT_KEY = "nandscape:flowchart-draft";

const SHORTCUTS: [string, string][] = [
  ["Double-click a box", "Rename it where it sits"],
  ["Enter", "Rename the selected box"],
  ["Drag a box", "Pin it where you drop it"],
  ["Drag from a box's dot", "Draw an arrow to another box"],
  ["Delete / Backspace", "Remove what is selected"],
  ["Ctrl / Cmd + Z", "Undo"],
  ["Ctrl / Cmd + Shift + Z", "Redo"],
  ["Escape", "Deselect"],
];

/**
 * The flowchart maker as a place rather than a widget.
 *
 * It used to be a 700px box two thirds of the way down an article, which is
 * the wrong shape for the job twice over: a chart of any size did not fit, and
 * the controls had to be miniaturised to sit beside it. Here the canvas gets
 * the window, the panels get room to be legible, and the reference material
 * that justified the tool page moves into a drawer instead of competing with
 * the tool for space.
 */
export function FlowchartStudio() {
  const doc = useFlowchartDoc(STARTER_CHART, DRAFT_KEY);
  const [help, setHelp] = useState(false);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-surface">
      <TopBar doc={doc} onHelp={() => setHelp(true)} />
      <FlowchartWorkbench doc={doc} variant="studio" />
      {help && <HelpDrawer onClose={() => setHelp(false)} />}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Top bar
 * ---------------------------------------------------------------------- */

function TopBar({
  doc,
  onHelp,
}: {
  doc: ReturnType<typeof useFlowchartDoc>;
  onHelp: () => void;
}) {
  const [jsonState, setJsonState] = useState<"idle" | "copied" | "failed">("idle");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(doc.spec, null, 2));
      setJsonState("copied");
    } catch {
      setJsonState("failed");
    }
    window.setTimeout(() => setJsonState("idle"), 1800);
  };

  const paste = async () => {
    try {
      const parsed: unknown = JSON.parse(await navigator.clipboard.readText());
      if (!isFlowchartSpec(parsed)) throw new Error();
      doc.replace(parsed);
    } catch {
      setJsonState("failed");
      window.setTimeout(() => setJsonState("idle"), 1800);
    }
  };

  return (
    <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-surface-card px-3 py-2">
      <Link href="/" className="flex items-center gap-2 pr-1" title="Nandscape home">
        <Logo className="h-5 w-5 shrink-0 text-ink" />
        <span className="hidden text-sm font-bold text-ink sm:inline">Nandscape</span>
      </Link>

      <span className="h-5 w-px bg-border" />

      <input
        value={doc.spec.title ?? ""}
        onChange={(e) =>
          doc.edit((d) => {
            d.title = e.target.value || undefined;
          }, "title")
        }
        placeholder="Untitled chart"
        aria-label="Chart title"
        className="min-w-0 max-w-64 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-ink outline-none transition-colors hover:border-border focus:border-copper"
      />

      <SaveBadge state={doc.save} />

      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        <TemplateMenu onPick={(spec) => doc.replace(spec)} />
        <Btn onClick={() => doc.replace(deepClone(EMPTY_CHART))} title="Start a new chart">
          <FilePlus2 className="h-3.5 w-3.5" />
          New
        </Btn>
        <Btn onClick={copy}>
          {jsonState === "copied" ? "Copied" : jsonState === "failed" ? "Failed" : "Copy JSON"}
        </Btn>
        <Btn onClick={paste}>Paste JSON</Btn>
        <Btn onClick={onHelp} title="Shortcuts and shape reference">
          <HelpCircle className="h-3.5 w-3.5" />
          Help
        </Btn>
        <ThemeToggle />
      </div>
    </header>
  );
}

/**
 * "Draft saved", quietly.
 *
 * There is no account and no save button, so the one thing worth saying is
 * that closing the tab will not lose the work. Anything louder would be a
 * notification about nothing happening.
 */
function SaveBadge({ state }: { state: "clean" | "saving" | "saved" }) {
  if (state === "clean") return null;
  return (
    <span
      className={cn(
        "flex items-center gap-1 text-[10px] font-semibold transition-opacity",
        state === "saving" ? "text-slate opacity-60" : "text-slate",
      )}
    >
      {state === "saved" && <Check className="h-3 w-3" />}
      {state === "saving" ? "Saving" : "Draft saved"}
    </span>
  );
}

/* -------------------------------------------------------------------------
 * Templates
 * ---------------------------------------------------------------------- */

function TemplateMenu({ onPick }: { onPick: (spec: FlowchartSpec) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (spec: FlowchartSpec) => {
    onPick(deepClone(spec));
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <Btn onClick={() => setOpen((v) => !v)} active={open}>
        Templates
        <ChevronDown className="h-3.5 w-3.5" />
      </Btn>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 max-h-[70vh] w-60 overflow-y-auto rounded-lg border border-border bg-surface-card p-1.5 shadow-xl">
          <button
            type="button"
            onClick={() => pick(STARTER_CHART)}
            className="w-full rounded-md px-2.5 py-1.5 text-left text-[11px] font-semibold text-ink-soft hover:bg-surface-2 hover:text-ink"
          >
            Blank starter
          </button>
          {CHART_GROUPS.map((group) => (
            <div key={group.label} className="mt-1">
              <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate">
                {group.label}
              </p>
              {group.charts.map((chart) => {
                const spec = ALL_CHARTS[chart.id];
                if (!spec) return null;
                return (
                  <button
                    key={chart.id}
                    type="button"
                    onClick={() => pick(spec)}
                    className="w-full rounded-md px-2.5 py-1.5 text-left text-[11px] text-ink-soft hover:bg-surface-2 hover:text-ink"
                  >
                    {chart.label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Help
 * ---------------------------------------------------------------------- */

function HelpDrawer({ onClose }: { onClose: () => void }) {
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
      aria-label="Flowchart maker help"
      className="fixed inset-0 z-100 flex justify-end bg-ink/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border bg-surface-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center gap-2 border-b border-border bg-surface-card px-4 py-3">
          <h2 className="text-sm font-bold text-ink">How this works</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close help"
            className="ml-auto rounded-md p-1 text-ink-soft hover:bg-surface-2 hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-6 px-4 py-4">
          <section>
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate">Shortcuts</h3>
            <dl className="flex flex-col gap-1.5">
              {SHORTCUTS.map(([keys, what]) => (
                <div key={keys} className="flex items-baseline gap-3">
                  <dt className="w-44 shrink-0 text-[11px] text-ink-soft">
                    <Kbd>{keys}</Kbd>
                  </dt>
                  <dd className="text-[11px] leading-relaxed text-slate">{what}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section>
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate">The shapes</h3>
            <p className="text-xs leading-relaxed text-ink-soft">
              A rounded pill is a terminal: start or end. A rectangle is a process, a step that does
              something. A diamond is a decision, which asks a yes/no question and has one arrow leaving it
              per answer. A parallelogram is input or output. These come from the ANSI and ISO 5807
              conventions and are near-universal, so a chart drawn with them reads correctly to anybody.
            </p>
          </section>

          <section>
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate">Layout</h3>
            <p className="text-xs leading-relaxed text-ink-soft">
              Boxes are placed automatically until you drag one, at which point that box stays where you
              put it and everything else keeps arranging itself around it. Auto-layout unpins every box at
              once; a single box can be unpinned from its own panel. Arrows that point back up the chart are
              drawn dashed and routed down the side, so loops are visible without tracing them.
            </p>
          </section>

          <section>
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate">Saving</h3>
            <p className="text-xs leading-relaxed text-ink-soft">
              Your chart is kept in this browser as you work, so closing the tab does not lose it. Nothing
              is uploaded and there is no account. Copy JSON takes the whole chart with you; Paste JSON
              brings one back, here or into a tutorial page.
            </p>
          </section>

          <section>
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate">Read more</h3>
            <ul className="flex flex-col gap-1.5">
              {[
                { label: "Merge sort, step by step", href: "/tutorials/dsa/sorting-merge-sort" },
                { label: "Quick sort and partitioning", href: "/tutorials/dsa/sorting-quick-sort" },
                { label: "Sorting algorithm visualizer", href: "/tools/sorting-algorithm-visualizer" },
                { label: "All the tools", href: "/tools" },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-xs font-medium text-copper hover:text-copper-dark"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
