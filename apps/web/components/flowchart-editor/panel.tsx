"use client";

/**
 * The SmartPanel: the tool picker, the collapsible helpers, and the symbol
 * library.
 *
 * Laid out the way SmartDraw lays it out, because that layout is doing real
 * work - the four tools are the first thing under the title, the symbols you
 * just used are above the ones you have to go looking for, and the library is
 * a search box over a stack of removable categories rather than a tree you
 * have to keep re-opening.
 */

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  MousePointer2,
  Plus,
  Search,
  Spline,
  Square,
  Type,
} from "lucide-react";

import { cn } from "@/lib/cn";
import type { LineKind } from "@/lib/flowchart-editor/model";
import {
  SYMBOL_CATEGORIES,
  searchSymbols,
  symbolFor,
  type SymbolDef,
} from "@/lib/flowchart-editor/symbols";
import { useEditor, type ToolKind } from "@/lib/flowchart-editor/store";
import { Menu, MenuItem, MenuLabel, MenuSeparator, PanelSection, useDismiss } from "./ui";
import { SymbolTile } from "./shape-view";

const LINE_KINDS: { id: LineKind; name: string; hint: string }[] = [
  { id: "straight", name: "Straight Line", hint: "Point to point, exactly as drawn" },
  { id: "orthogonal", name: "Shape Connector", hint: "Right-angled runs; each bend is yours to place" },
  { id: "rounded", name: "Rounded Connector", hint: "The same bends, filleted" },
  { id: "curved", name: "Curved Connector", hint: "A smooth curve through every bend" },
  { id: "arc", name: "Curved Line", hint: "A single arc between two points" },
];

const SELECT_MODES: { id: ToolKind; name: string; hint: string }[] = [
  { id: "select", name: "Select", hint: "Click to select, drag to move" },
  { id: "pan", name: "Pan", hint: "Drag the page around" },
];

export function SmartPanel() {
  const tool = useEditor((s) => s.tool);
  const setTool = useEditor((s) => s.setTool);
  const recent = useEditor((s) => s.recentSymbols);
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const [hidden, setHidden] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);

  const results = useMemo(() => searchSymbols(query), [query]);
  const categories = SYMBOL_CATEGORIES.filter((c) => !hidden.includes(c.name)).slice(
    0,
    showAll ? undefined : 2,
  );

  if (collapsed) {
    return (
      <aside className="flex w-8 shrink-0 flex-col items-center border-r border-fe-line bg-fe-panel py-2">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          title="Show tools"
          className="rounded p-1 text-fe-muted hover:bg-fe-hover hover:text-fe-ink"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex w-[272px] shrink-0 flex-col border-r border-fe-line bg-fe-panel">
      <div className="flex items-center gap-1 px-3 pb-1 pt-2.5">
        <h2 className="text-base font-semibold text-fe-ink">Tools</h2>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          title="Hide tools"
          className="rounded p-0.5 text-fe-muted hover:bg-fe-hover hover:text-fe-ink"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      {/* The four tools. Select and Line carry a caret because each has modes. */}
      <div className="flex gap-1 px-2.5 pb-3 pt-1">
        <ToolButton
          icon={<MousePointer2 className="h-5 w-5" strokeWidth={1.7} />}
          label="Select"
          active={tool.kind === "select" || tool.kind === "pan"}
          onClick={() => setTool({ kind: "select" })}
          menu={(close) => (
            <>
              <MenuLabel>Pointer</MenuLabel>
              {SELECT_MODES.map((m) => (
                <MenuItem
                  key={m.id}
                  active={tool.kind === m.id}
                  onClick={() => {
                    setTool({ kind: m.id });
                    close();
                  }}
                >
                  {m.name}
                </MenuItem>
              ))}
            </>
          )}
        />
        <ToolButton
          icon={<Square className="h-5 w-5" strokeWidth={1.7} />}
          label="Shape"
          active={tool.kind === "shape"}
          onClick={() => setTool({ kind: "shape" })}
          menu={(close) => (
            <>
              <MenuLabel>Stamp a shape</MenuLabel>
              {recent.slice(0, 7).map((key) => (
                <MenuItem
                  key={key}
                  active={tool.kind === "shape" && tool.symbol === key}
                  onClick={() => {
                    setTool({ kind: "shape", symbol: key });
                    close();
                  }}
                >
                  {symbolFor(key).name}
                </MenuItem>
              ))}
            </>
          )}
        />
        <ToolButton
          icon={<Spline className="h-5 w-5" strokeWidth={1.7} />}
          label="Line"
          active={tool.kind === "line"}
          onClick={() => setTool({ kind: "line" })}
          menu={(close) => (
            <>
              <MenuLabel>Line type</MenuLabel>
              {LINE_KINDS.map((k) => (
                <MenuItem
                  key={k.id}
                  active={tool.lineKind === k.id}
                  onClick={() => {
                    setTool({ kind: "line", lineKind: k.id });
                    close();
                  }}
                >
                  {k.name}
                </MenuItem>
              ))}
              <MenuSeparator />
              <MenuItem
                active={tool.sticky}
                onClick={() => {
                  setTool({ sticky: !tool.sticky });
                  close();
                }}
                shortcut="Shift"
              >
                Keep the tool armed
              </MenuItem>
            </>
          )}
        />
        <ToolButton
          icon={<Type className="h-5 w-5" strokeWidth={1.7} />}
          label="Text"
          active={tool.kind === "text"}
          onClick={() => setTool({ kind: "text" })}
        />
      </div>

      <div className="flex flex-col gap-1 px-2.5">
        <PanelSection title="Swimlanes">
          <div className="flex flex-wrap gap-1 pt-1">
            {["swimlane-v", "swimlane-h", "swimlane-v3", "swimlane-h3"].map((key) => (
              <LibraryTile key={key} symbol={key} />
            ))}
          </div>
        </PanelSection>
        <PanelSection title="Spacing">
          <SpacingControls />
        </PanelSection>
        <PanelSection title="Sub-Processes">
          <div className="flex flex-wrap gap-1 pt-1">
            {["predefined-process", "internal-storage", "off-page", "connector"].map((key) => (
              <LibraryTile key={key} symbol={key} />
            ))}
          </div>
        </PanelSection>
        <PanelSection title="Recently Used Symbols" defaultOpen>
          <div className="grid grid-cols-4 gap-0.5 pt-1">
            {recent.map((key) => (
              <LibraryTile key={key} symbol={key} />
            ))}
          </div>
        </PanelSection>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col px-3">
        <h3 className="pb-2 text-base font-semibold text-fe-ink">Symbols</h3>
        <div className="flex items-center gap-2 pb-2">
          <div className="flex flex-1 items-center rounded border border-fe-line bg-fe-field">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for symbols..."
              aria-label="Search for symbols"
              className="h-7 min-w-0 flex-1 bg-transparent px-2 text-[11px] text-fe-ink outline-none placeholder:text-fe-muted"
            />
            <span className="flex h-7 w-7 items-center justify-center border-l border-fe-line text-fe-muted">
              <Search className="h-3.5 w-3.5" />
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="flex items-center gap-1 text-[11px] font-medium text-fe-link hover:underline"
          >
            More
            <Plus className="h-3 w-3" />
          </button>
        </div>

        <div className="-mr-1 min-h-0 flex-1 overflow-y-auto pr-1 pb-3">
          {query ? (
            <CategoryBlock
              name={`${results.length} result${results.length === 1 ? "" : "s"}`}
              symbols={results}
            />
          ) : (
            categories.map((c) => (
              <CategoryBlock
                key={c.name}
                name={c.name}
                symbols={c.symbols}
                onHide={() => setHidden((h) => [...h, c.name])}
              />
            ))
          )}
        </div>
      </div>
    </aside>
  );
}

/* -------------------------------------------------------------------------
 * Pieces
 * ---------------------------------------------------------------------- */

function ToolButton({
  icon,
  label,
  active,
  onClick,
  menu,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  menu?: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={cn(
          "flex h-[58px] w-[58px] flex-col items-center justify-center gap-1 rounded border text-[11px] transition-colors",
          active
            ? "border-fe-accent bg-fe-accent-soft text-fe-ink"
            : "border-transparent text-fe-ink hover:bg-fe-hover",
        )}
      >
        <span className="text-fe-icon">{icon}</span>
        {label}
      </button>
      {menu && (
        <button
          type="button"
          aria-label={`${label} options`}
          onClick={() => setOpen((v) => !v)}
          className="absolute -right-0.5 top-0 rounded p-0.5 text-fe-muted hover:bg-fe-hover hover:text-fe-ink"
        >
          <ChevronDown className="h-3 w-3" strokeWidth={2.5} />
        </button>
      )}
      {open && menu && <Menu className="left-auto right-0">{menu(() => setOpen(false))}</Menu>}
    </div>
  );
}

/**
 * A library tile. Clicking arms the Shape tool with it; dragging drops it where
 * it lands. Both work, because a person reaching for a symbol has already
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

function CategoryBlock({
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
    <section className="mb-2 rounded border border-fe-line">
      <div className="flex items-center bg-fe-panel-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-center gap-1.5 px-2 py-1.5 text-left text-xs font-medium text-fe-ink"
        >
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 text-fe-muted" strokeWidth={2.5} />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-fe-muted" strokeWidth={2.5} />
          )}
          {name}
        </button>
        {onHide && (
          <button
            type="button"
            onClick={onHide}
            aria-label={`Hide ${name}`}
            className="mr-1 rounded p-1 text-fe-muted hover:bg-fe-hover hover:text-fe-ink"
          >
            <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
              <path d="M2 2 L10 10 M10 2 L2 10" stroke="currentColor" strokeWidth="1.6" fill="none" />
            </svg>
          </button>
        )}
      </div>
      {open && (
        <div className="grid grid-cols-4 gap-0.5 p-1.5">
          {symbols.map((s) => (
            <LibraryTile key={s.key} symbol={s.key} />
          ))}
        </div>
      )}
    </section>
  );
}

function SpacingControls() {
  const gridSize = useEditor((s) => s.gridSize);
  const snap = useEditor((s) => s.snapToGrid);
  const show = useEditor((s) => s.showGrid);
  const guides = useEditor((s) => s.smartGuides);
  const setGrid = useEditor((s) => s.setGrid);

  return (
    <div className="flex flex-col gap-2 pt-1.5">
      <label className="flex items-center justify-between text-[11px] text-fe-ink">
        Grid size
        <select
          value={gridSize}
          onChange={(e) => setGrid({ gridSize: Number(e.target.value) })}
          className="h-6 rounded border border-fe-line bg-fe-field px-1 text-[11px] text-fe-ink outline-none"
        >
          {[5, 10, 20, 25].map((n) => (
            <option key={n} value={n}>
              {n} px
            </option>
          ))}
        </select>
      </label>
      {[
        { label: "Snap to grid", value: snap, set: (v: boolean) => setGrid({ snapToGrid: v }) },
        { label: "Show grid", value: show, set: (v: boolean) => setGrid({ showGrid: v }) },
        { label: "Alignment guides", value: guides, set: (v: boolean) => setGrid({ smartGuides: v }) },
      ].map((row) => (
        <label key={row.label} className="flex items-center gap-2 text-[11px] text-fe-ink">
          <input
            type="checkbox"
            checked={row.value}
            onChange={(e) => row.set(e.target.checked)}
            className="h-3.5 w-3.5 accent-[var(--fe-accent)]"
          />
          {row.label}
        </label>
      ))}
    </div>
  );
}
