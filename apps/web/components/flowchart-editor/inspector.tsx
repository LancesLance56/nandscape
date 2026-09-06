"use client";

/**
 * The inspector.
 *
 * Three tabs on the right edge: where shapes come from, what the selection
 * looks like, and what it means. Putting the library here rather than on the
 * left is the single biggest structural difference from the tool this replaced
 * - it means the dock is the only thing on the left, the canvas starts 56px in
 * instead of 320px in, and everything that answers "what is selected" lives on
 * one edge instead of being split between a panel and a ribbon.
 */

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Search, Trash2, X } from "lucide-react";

import { cn } from "@/lib/cn";
import { isShape, newId, type Shape, type WalkStep } from "@/lib/flowchart-editor/model";
import {
  SYMBOL_CATEGORIES,
  searchSymbols,
  symbolFor,
  type SymbolDef,
} from "@/lib/flowchart-editor/symbols";
import { useEditor } from "@/lib/flowchart-editor/store";
import { SymbolTile } from "./shape-view";
import { PanelSection, fieldCls } from "./ui";
import { ColorGrid } from "./topbar";

type Tab = "symbols" | "style" | "notes";

const TABS: { id: Tab; label: string }[] = [
  { id: "symbols", label: "Symbols" },
  { id: "style", label: "Style" },
  { id: "notes", label: "Notes" },
];

export function Inspector() {
  const [tab, setTab] = useState<Tab>("symbols");
  const [collapsed, setCollapsed] = useState(false);
  const selection = useEditor((s) => s.selection);

  if (collapsed) {
    return (
      <aside className="flex w-8 shrink-0 flex-col items-center border-l border-fe-line bg-fe-panel py-2">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          title="Show the inspector"
          className="rounded p-1 text-fe-muted hover:bg-fe-hover hover:text-fe-ink"
        >
          <ChevronLeftIcon />
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex w-[292px] shrink-0 flex-col border-l border-fe-line bg-fe-panel">
      <div className="flex items-center gap-1 border-b border-fe-line px-1.5 pt-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "relative rounded-t-md px-2.5 py-1.5 text-[11px] font-medium transition-colors",
              tab === t.id
                ? "text-fe-accent-strong after:absolute after:inset-x-1 after:-bottom-px after:h-0.5 after:rounded-full after:bg-fe-accent"
                : "text-fe-muted hover:text-fe-ink",
            )}
          >
            {t.label}
            {t.id === "notes" && selection.length === 1 && <NoteDot />}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          title="Hide the inspector"
          className="ml-auto mb-1 rounded p-1 text-fe-muted hover:bg-fe-hover hover:text-fe-ink"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "symbols" && <SymbolsTab />}
        {tab === "style" && <StyleTab />}
        {tab === "notes" && <NotesTab />}
      </div>
    </aside>
  );
}

function ChevronLeftIcon() {
  return <ChevronRight className="h-4 w-4 rotate-180" />;
}

function NoteDot() {
  const selection = useEditor((s) => s.selection);
  const page = useEditor((s) => s.doc.pages[s.pageIndex]);
  const el = page.elements.find((e) => e.id === selection[0]);
  if (!el?.note) return null;
  return <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-fe-accent align-middle" />;
}

/* -------------------------------------------------------------------------
 * Symbols
 * ---------------------------------------------------------------------- */

function SymbolsTab() {
  const recent = useEditor((s) => s.recentSymbols);
  const [query, setQuery] = useState("");
  const [hidden, setHidden] = useState<string[]>([]);

  const results = useMemo(() => searchSymbols(query), [query]);
  const categories = SYMBOL_CATEGORIES.filter((c) => !hidden.includes(c.name));

  return (
    <div className="flex flex-col gap-3 p-2.5">
      <div className="flex items-center rounded-md border border-fe-line bg-fe-field">
        <span className="flex h-7 w-7 items-center justify-center text-fe-muted">
          <Search className="h-3.5 w-3.5" />
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search symbols"
          aria-label="Search symbols"
          className="h-7 min-w-0 flex-1 bg-transparent pr-2 text-[11px] text-fe-ink outline-none placeholder:text-fe-muted"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear the search"
            className="flex h-7 w-7 items-center justify-center text-fe-muted hover:text-fe-ink"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {query ? (
        <Category name={`${results.length} result${results.length === 1 ? "" : "s"}`} symbols={results} />
      ) : (
        <>
          <section>
            <h3 className="mb-1.5 px-0.5 text-[10px] font-bold uppercase tracking-wider text-fe-muted">
              Recent
            </h3>
            <div className="grid grid-cols-4 gap-0.5">
              {recent.map((key) => (
                <LibraryTile key={key} symbol={key} />
              ))}
            </div>
          </section>
          {categories.map((c) => (
            <Category
              key={c.name}
              name={c.name}
              symbols={c.symbols}
              onHide={() => setHidden((h) => [...h, c.name])}
            />
          ))}
          {hidden.length > 0 && (
            <button
              type="button"
              onClick={() => setHidden([])}
              className="self-start text-[11px] font-medium text-fe-link hover:underline"
            >
              Show {hidden.length} hidden {hidden.length === 1 ? "category" : "categories"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

/**
 * A library tile. Clicking arms the Shape tool with it; dragging drops it where
 * it lands. Both work, because someone reaching for a symbol has already
 * decided which of the two they meant.
 */
function LibraryTile({ symbol }: { symbol: string }) {
  const tool = useEditor((s) => s.tool);
  const setTool = useEditor((s) => s.setTool);
  return (
    <SymbolTile
      symbol={symbol}
      selected={tool.kind === "shape" && tool.symbol === symbol}
      onPick={() => setTool({ kind: "shape", symbol })}
      onDragStart={(e) => {
        e.dataTransfer.setData("application/x-nandscape-symbol", symbol);
        e.dataTransfer.effectAllowed = "copy";
      }}
    />
  );
}

function Category({
  name,
  symbols,
  onHide,
}: {
  name: string;
  symbols: SymbolDef[];
  onHide?: () => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <section>
      <div className="mb-1.5 flex items-center">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-center gap-1 px-0.5 text-left text-[10px] font-bold uppercase tracking-wider text-fe-muted"
        >
          {open ? <ChevronDown className="h-3 w-3" strokeWidth={3} /> : <ChevronRight className="h-3 w-3" strokeWidth={3} />}
          {name}
        </button>
        {onHide && (
          <button
            type="button"
            onClick={onHide}
            aria-label={`Hide ${name}`}
            className="rounded p-0.5 text-fe-muted hover:bg-fe-hover hover:text-fe-ink"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      {open && (
        <div className="grid grid-cols-4 gap-0.5">
          {symbols.map((s) => (
            <LibraryTile key={s.key} symbol={s.key} />
          ))}
        </div>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------
 * Style
 * ---------------------------------------------------------------------- */

const QUICK_STYLES = [
  { name: "Paper", fill: "#ffffff", stroke: "#252525", textColor: "#252525" },
  { name: "Wash", fill: "#f4f4f4", stroke: "#545454", textColor: "#252525" },
  { name: "Leaf", fill: "#e0efe2", stroke: "#2b8341", textColor: "#1f6b33" },
  { name: "Amber", fill: "#faf0d4", stroke: "#b8860b", textColor: "#7a5a07" },
  { name: "Coral", fill: "#fbe3dd", stroke: "#b33f2a", textColor: "#8c3220" },
  { name: "Blue", fill: "#e2ecfb", stroke: "#2f6fd0", textColor: "#24559f" },
  { name: "Rose", fill: "#f7e2ec", stroke: "#c24a7c", textColor: "#98325c" },
  { name: "Bare", fill: "transparent", stroke: "#252525", textColor: "#252525" },
] as const;

function StyleTab() {
  const s = useEditor();
  const page = s.doc.pages[s.pageIndex];
  const selected = page.elements.filter((e) => s.selection.includes(e.id));
  const shapes = selected.filter(isShape) as Shape[];
  const one = selected.length === 1 && shapes.length === 1 ? shapes[0] : null;

  if (selected.length === 0) {
    return (
      <div className="flex flex-col gap-3 p-2.5">
        <p className="rounded-md border border-dashed border-fe-line px-3 py-6 text-center text-[11px] leading-relaxed text-fe-muted">
          Select something to style it.
        </p>
        <PanelSection title="Page" defaultOpen>
          <div className="flex flex-col gap-2 pt-1">
            <Row label="Width">
              <input
                type="number"
                value={page.width}
                onChange={(e) => s.mutate((p) => { p.width = Math.max(200, Number(e.target.value) || p.width); })}
                className={cn(fieldCls, "w-20")}
              />
            </Row>
            <Row label="Height">
              <input
                type="number"
                value={page.height}
                onChange={(e) => s.mutate((p) => { p.height = Math.max(200, Number(e.target.value) || p.height); })}
                className={cn(fieldCls, "w-20")}
              />
            </Row>
          </div>
        </PanelSection>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-2.5">
      <PanelSection title="Presets" defaultOpen>
        <div className="grid grid-cols-4 gap-1 pt-1">
          {QUICK_STYLES.map((q) => (
            <button
              key={q.name}
              type="button"
              title={q.name}
              onClick={() => {
                s.styleShapes(s.selection, { fill: q.fill, stroke: q.stroke, textColor: q.textColor });
                s.styleLines(s.selection, { stroke: q.stroke, textColor: q.textColor });
              }}
              className="flex h-9 items-center justify-center rounded border border-fe-line transition-transform hover:scale-105"
              style={{
                background: q.fill === "transparent" ? "transparent" : q.fill,
                borderColor: q.stroke,
                color: q.textColor,
              }}
            >
              <span className="text-[9px] font-semibold">{q.name}</span>
            </button>
          ))}
        </div>
      </PanelSection>

      {one && (
        <PanelSection title="Position and size" defaultOpen>
          <div className="grid grid-cols-2 gap-2 pt-1">
            {(["x", "y", "width", "height"] as const).map((k) => (
              <Row key={k} label={k === "x" ? "X" : k === "y" ? "Y" : k === "width" ? "W" : "H"}>
                <input
                  type="number"
                  value={Math.round(one[k])}
                  onChange={(e) => s.updateShapes([one.id], { [k]: Number(e.target.value) || 0 } as Partial<Shape>)}
                  className={cn(fieldCls, "w-full")}
                />
              </Row>
            ))}
            <Row label="Angle">
              <input
                type="number"
                value={Math.round(one.rotation)}
                onChange={(e) => s.updateShapes([one.id], { rotation: Number(e.target.value) || 0 })}
                className={cn(fieldCls, "w-full")}
              />
            </Row>
            <Row label="Symbol">
              <select
                value={one.symbol}
                onChange={(e) => s.updateShapes([one.id], { symbol: e.target.value })}
                className={cn(fieldCls, "w-full")}
              >
                {SYMBOL_CATEGORIES.flatMap((c) => c.symbols).map((sym) => (
                  <option key={sym.key} value={sym.key}>{sym.name}</option>
                ))}
              </select>
            </Row>
          </div>
        </PanelSection>
      )}

      {shapes.length > 0 && (
        <PanelSection title="Fill and outline" defaultOpen>
          <div className="flex flex-col gap-2 pt-1">
            <Row label="Fill">
              <SwatchField
                color={shapes[0].style.fill}
                onPick={(c) => s.styleShapes(s.selection, { fill: c })}
              />
            </Row>
            <Row label="Outline">
              <SwatchField
                color={shapes[0].style.stroke}
                onPick={(c) => { s.styleShapes(s.selection, { stroke: c }); s.styleLines(s.selection, { stroke: c }); }}
              />
            </Row>
            <Row label="Text">
              <SwatchField
                color={shapes[0].style.textColor}
                onPick={(c) => { s.styleShapes(s.selection, { textColor: c }); s.styleLines(s.selection, { textColor: c }); }}
              />
            </Row>
            <Row label="Badge">
              <input
                value={one?.badge ?? ""}
                placeholder="e.g. 1"
                onChange={(e) => one && s.updateShapes([one.id], { badge: e.target.value || undefined })}
                disabled={!one}
                className={cn(fieldCls, "w-20")}
              />
            </Row>
          </div>
        </PanelSection>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-2 text-[11px] text-fe-ink">
      <span className="shrink-0 text-fe-muted">{label}</span>
      {children}
    </label>
  );
}

function SwatchField({ color, onPick }: { color: string; onPick: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-6 w-20 rounded border border-fe-line"
        style={{
          background:
            color === "transparent"
              ? "repeating-linear-gradient(45deg,#bbb,#bbb 3px,#fff 3px,#fff 6px)"
              : color,
        }}
      />
      {open && (
        <span className="absolute right-0 top-full z-50 mt-1 block rounded-md border border-fe-line bg-fe-panel shadow-lg">
          <ColorGrid
            onPick={(c) => {
              onPick(c);
              setOpen(false);
            }}
          />
        </span>
      )}
    </span>
  );
}

/* -------------------------------------------------------------------------
 * Notes and walkthrough
 * ---------------------------------------------------------------------- */

/**
 * The two things that make a diagram teach rather than merely depict: a note
 * per element, and an ordered path through them.
 *
 * Both were features of the chart format this editor replaced, and both had to
 * survive the move or the migration would have quietly cost every tutorial its
 * explanations.
 */
function NotesTab() {
  const s = useEditor();
  const page = s.doc.pages[s.pageIndex];
  const selected = page.elements.filter((e) => s.selection.includes(e.id));
  const one = selected.length === 1 ? selected[0] : null;
  const steps = page.walkthrough ?? [];

  const labelFor = (id: string): string => {
    const el = page.elements.find((e) => e.id === id);
    if (!el) return "(removed)";
    if (isShape(el)) return el.text.split("\n")[0] || symbolFor(el.symbol).name;
    return el.label || "connector";
  };

  return (
    <div className="flex flex-col gap-2 p-2.5">
      <PanelSection title="Note on the selection" defaultOpen>
        {one ? (
          <textarea
            value={one.note ?? ""}
            onChange={(e) =>
              s.mutate((p) => {
                const el = p.elements.find((x) => x.id === one.id);
                if (el) el.note = e.target.value || undefined;
              }, `note:${one.id}`)
            }
            rows={4}
            placeholder="Why this step exists — shown when a reader clicks it."
            className={cn(fieldCls, "mt-1 h-auto w-full resize-y py-1.5 leading-relaxed")}
          />
        ) : (
          <p className="pt-1 text-[11px] leading-relaxed text-fe-muted">
            Select one shape or connector to write a note on it.
          </p>
        )}
      </PanelSection>

      <PanelSection title={`Walkthrough (${steps.length})`} defaultOpen>
        <div className="flex flex-col gap-1.5 pt-1">
          {steps.length === 0 && (
            <p className="text-[11px] leading-relaxed text-fe-muted">
              An ordered path through the diagram. Readers can play it, and each step gets a caption.
            </p>
          )}
          {steps.map((step, i) => (
            <StepRow
              key={step.id}
              index={i}
              step={step}
              label={step.target ? labelFor(step.target) : "no target"}
              onCaption={(caption) =>
                s.mutate((p) => {
                  const w = p.walkthrough?.find((x) => x.id === step.id);
                  if (w) w.caption = caption;
                }, `step:${step.id}`)
              }
              onTarget={() =>
                s.mutate((p) => {
                  const w = p.walkthrough?.find((x) => x.id === step.id);
                  if (w) w.target = s.selection[0];
                })
              }
              onSelect={() => step.target && s.select([step.target])}
              onRemove={() =>
                s.mutate((p) => {
                  p.walkthrough = (p.walkthrough ?? []).filter((x) => x.id !== step.id);
                })
              }
              onMove={(delta) =>
                s.mutate((p) => {
                  const list = p.walkthrough ?? [];
                  const j = i + delta;
                  if (j < 0 || j >= list.length) return;
                  [list[i], list[j]] = [list[j], list[i]];
                })
              }
            />
          ))}
          <button
            type="button"
            onClick={() =>
              s.mutate((p) => {
                const step: WalkStep = {
                  id: newId("w"),
                  target: s.selection[0],
                  caption: "",
                };
                p.walkthrough = [...(p.walkthrough ?? []), step];
              })
            }
            className="mt-1 flex items-center justify-center gap-1 rounded-md border border-dashed border-fe-line py-1.5 text-[11px] font-medium text-fe-muted transition-colors hover:border-fe-accent hover:text-fe-accent-strong"
          >
            <Plus className="h-3.5 w-3.5" />
            {s.selection.length === 1 ? "Add the selection as a step" : "Add a step"}
          </button>
        </div>
      </PanelSection>
    </div>
  );
}

function StepRow({
  index,
  step,
  label,
  onCaption,
  onTarget,
  onSelect,
  onRemove,
  onMove,
}: {
  index: number;
  step: WalkStep;
  label: string;
  onCaption: (v: string) => void;
  onTarget: () => void;
  onSelect: () => void;
  onRemove: () => void;
  onMove: (delta: number) => void;
}) {
  return (
    <div className="rounded-md border border-fe-line bg-fe-panel-2 p-1.5">
      <div className="flex items-center gap-1">
        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-fe-accent text-[9px] font-bold text-fe-accent-ink">
          {index + 1}
        </span>
        <button
          type="button"
          onClick={onSelect}
          title="Select this step's element"
          className="min-w-0 flex-1 truncate text-left text-[11px] text-fe-ink hover:text-fe-accent-strong hover:underline"
        >
          {label}
        </button>
        <button type="button" onClick={() => onMove(-1)} aria-label="Move up" className="rounded px-1 text-[10px] text-fe-muted hover:bg-fe-hover">↑</button>
        <button type="button" onClick={() => onMove(1)} aria-label="Move down" className="rounded px-1 text-[10px] text-fe-muted hover:bg-fe-hover">↓</button>
        <button type="button" onClick={onTarget} title="Point this step at the current selection" className="rounded px-1 text-[10px] text-fe-muted hover:bg-fe-hover">⌖</button>
        <button type="button" onClick={onRemove} aria-label="Remove this step" className="rounded p-0.5 text-fe-muted hover:bg-fe-hover hover:text-fe-ink">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      <textarea
        value={step.caption}
        onChange={(e) => onCaption(e.target.value)}
        rows={2}
        placeholder="What happens here"
        className={cn(fieldCls, "mt-1 h-auto w-full resize-y py-1 leading-snug")}
      />
    </div>
  );
}
