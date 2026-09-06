"use client";

/**
 * The contextual bar.
 *
 * One row, and what is in it depends entirely on what is selected: nothing
 * selected shows the drawing's own settings, a shape shows fill and type, a
 * connector shows stroke and arrowheads, several of anything shows align and
 * order. A ribbon does the opposite - every command, all the time, grouped by
 * theme - and the two read as different applications from across the room,
 * which is the point.
 *
 * Only three things are unconditional: the title, undo/redo, and Export. Those
 * are the ones you reach for without looking.
 */

import {
  AlignEndHorizontal,
  AlignHorizontalSpaceAround,
  AlignStartHorizontal,
  ArrowRight,
  BringToFront,
  Circle,
  Copy,
  Download,
  Droplet,
  Group,
  Grid3x3,
  Magnet,
  PaintBucket,
  Redo2,
  RotateCw,
  Ruler,
  Spline,
  Trash2,
  Ungroup,
  Undo2,
  Waypoints,
} from "lucide-react";

import { cn } from "@/lib/cn";
import { isShape, type ArrowHead, type LineKind, type Shape } from "@/lib/flowchart-editor/model";
import { useEditor } from "@/lib/flowchart-editor/store";
import { exportJson, exportPng, exportSvg } from "@/lib/flowchart-editor/export";
import {
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MiniButton,
  Swatch,
  ToolbarButton,
  ToolbarDivider,
  ToolbarGroup,
  fieldCls,
} from "./ui";

/** The site palette, as the ink a drawing is made from. */
const PALETTE = [
  "#252525", "#545454", "#7d7d7d", "#cfcfcf", "#ececec", "#ffffff",
  "#1f6b33", "#2b8341", "#e0efe2", "#b8860b", "#e8b93c", "#faf0d4",
  "#b33f2a", "#e1543b", "#fbe3dd", "#2f6fd0", "#5b9bf5", "#e2ecfb",
  "#c24a7c", "#f7e2ec", "#0f7e4a", "#dff3e7", "#3d2f26", "#f4f4f4",
];

const FONTS = ["Inter", "Georgia", "Courier New", "Arial", "Verdana", "Times New Roman"];
const SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48];

const DASHES: { label: string; value: string }[] = [
  { label: "Solid", value: "" },
  { label: "Dashed", value: "6 4" },
  { label: "Dotted", value: "1.5 3" },
  { label: "Dash-dot", value: "8 3 2 3" },
];

const ARROWS: { label: string; value: ArrowHead }[] = [
  { label: "None", value: "none" },
  { label: "Arrow", value: "arrow" },
  { label: "Open arrow", value: "open" },
  { label: "Circle", value: "circle" },
  { label: "Diamond", value: "diamond" },
  { label: "Bar", value: "bar" },
];

const LINE_KINDS: { id: LineKind; name: string }[] = [
  { id: "straight", name: "Straight" },
  { id: "orthogonal", name: "Right-angled" },
  { id: "rounded", name: "Right-angled, rounded" },
  { id: "curved", name: "Curved through bends" },
  { id: "arc", name: "Single arc" },
];

export function TopBar() {
  const s = useEditor();
  const page = s.doc.pages[Math.min(s.pageIndex, s.doc.pages.length - 1)];
  const selection = s.selection;
  const selected = page.elements.filter((e) => selection.includes(e.id));
  const shapes = selected.filter(isShape) as Shape[];
  const lines = selected.filter((e) => e.kind === "line");
  const many = selected.length > 1;

  return (
    <header className="flex h-11 shrink-0 items-center gap-1 border-b border-fe-line bg-fe-panel px-2">
      <input
        value={s.doc.title}
        onChange={(e) => s.setTitle(e.target.value)}
        aria-label="Drawing title"
        placeholder="Untitled drawing"
        className="h-7 w-48 shrink-0 rounded-md border border-transparent bg-transparent px-2 text-[13px] font-semibold text-fe-ink outline-none transition-colors hover:border-fe-line focus:border-fe-accent"
      />

      <ToolbarDivider />

      <ToolbarGroup>
        <ToolbarButton
          icon={<Undo2 className="h-4 w-4" />}
          label="Undo  (Ctrl+Z)"
          disabled={s.past.length === 0}
          onClick={s.undo}
        />
        <ToolbarButton
          icon={<Redo2 className="h-4 w-4" />}
          label="Redo  (Ctrl+Shift+Z)"
          disabled={s.future.length === 0}
          onClick={s.redo}
        />
      </ToolbarGroup>

      <ToolbarDivider />

      {/* The contextual middle. Everything below here appears because of what
          is selected, and disappears with it. */}
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {selected.length === 0 && <DrawingControls />}

        {shapes.length > 0 && <ShapeControls shapes={shapes} />}

        {lines.length > 0 && <LineControls ids={selection} />}

        {selected.length > 0 && (
          <>
            <ToolbarDivider />
            <ToolbarGroup>
              <ToolbarButton
                icon={<BringToFront className="h-4 w-4" />}
                label="Order"
                menu={(close) => (
                  <>
                    <MenuItem onClick={() => { s.order(selection, "front"); close(); }}>Bring to front</MenuItem>
                    <MenuItem onClick={() => { s.order(selection, "forward"); close(); }}>Bring forward</MenuItem>
                    <MenuItem onClick={() => { s.order(selection, "backward"); close(); }}>Send backward</MenuItem>
                    <MenuItem onClick={() => { s.order(selection, "back"); close(); }}>Send to back</MenuItem>
                  </>
                )}
              />
              <ToolbarButton
                icon={<Copy className="h-4 w-4" />}
                label="Duplicate  (Ctrl+D)"
                onClick={s.duplicateSelection}
              />
              <ToolbarButton
                icon={<Trash2 className="h-4 w-4" />}
                label="Delete  (Del)"
                onClick={() => s.deleteElements(selection)}
              />
            </ToolbarGroup>
          </>
        )}

        {many && (
          <>
            <ToolbarDivider />
            <ToolbarGroup>
              <ToolbarButton
                icon={<AlignStartHorizontal className="h-4 w-4" />}
                label="Align"
                disabled={shapes.length < 2}
                menu={(close) => (
                  <>
                    <MenuLabel>Align</MenuLabel>
                    {([
                      ["Left edges", "left"], ["Centres", "hcenter"], ["Right edges", "right"],
                      ["Top edges", "top"], ["Middles", "vcenter"], ["Bottom edges", "bottom"],
                    ] as const).map(([label, how]) => (
                      <MenuItem key={how} onClick={() => { s.align(selection, how); close(); }}>{label}</MenuItem>
                    ))}
                  </>
                )}
              />
              <ToolbarButton
                icon={<AlignHorizontalSpaceAround className="h-4 w-4" />}
                label="Space evenly"
                disabled={shapes.length < 3}
                menu={(close) => (
                  <>
                    <MenuItem onClick={() => { s.distribute(selection, "h"); close(); }}>Across</MenuItem>
                    <MenuItem onClick={() => { s.distribute(selection, "v"); close(); }}>Down</MenuItem>
                  </>
                )}
              />
              <ToolbarButton
                icon={<Ruler className="h-4 w-4" />}
                label="Make the same size as the first selected"
                disabled={shapes.length < 2}
                menu={(close) => (
                  <>
                    <MenuItem onClick={() => { s.makeSame(selection, "width"); close(); }}>Same width</MenuItem>
                    <MenuItem onClick={() => { s.makeSame(selection, "height"); close(); }}>Same height</MenuItem>
                    <MenuItem onClick={() => { s.makeSame(selection, "both"); close(); }}>Same size</MenuItem>
                  </>
                )}
              />
              <ToolbarButton
                icon={<Group className="h-4 w-4" />}
                label="Group  (Ctrl+G)"
                onClick={() => s.group(selection)}
              />
              <ToolbarButton
                icon={<Ungroup className="h-4 w-4" />}
                label="Ungroup  (Ctrl+Shift+G)"
                onClick={() => s.ungroup(selection)}
              />
            </ToolbarGroup>
          </>
        )}
      </div>

      <ToolbarDivider />

      <ToolbarButton
        wide
        icon={
          <span className="flex items-center gap-1 px-0.5">
            <Download className="h-4 w-4" />
            Export
          </span>
        }
        label="Export this drawing"
        menu={(close) => (
          <>
            <MenuItem onClick={() => { exportPng(page, s.doc.title); close(); }}>PNG image</MenuItem>
            <MenuItem onClick={() => { exportSvg(page, s.doc.title); close(); }}>SVG vector</MenuItem>
            <MenuItem onClick={() => { exportJson(s.doc); close(); }}>JSON (this drawing)</MenuItem>
            <MenuSeparator />
            <MenuItem onClick={() => { window.print(); close(); }} shortcut="Ctrl+P">Print</MenuItem>
          </>
        )}
      />
    </header>
  );
}

/* -------------------------------------------------------------------------
 * Contextual clusters
 * ---------------------------------------------------------------------- */

/** Nothing selected: the page's own settings, which have nowhere else to live. */
function DrawingControls() {
  const showGrid = useEditor((s) => s.showGrid);
  const snapToGrid = useEditor((s) => s.snapToGrid);
  const smartGuides = useEditor((s) => s.smartGuides);
  const gridSize = useEditor((s) => s.gridSize);
  const setGrid = useEditor((s) => s.setGrid);

  return (
    <ToolbarGroup>
      <ToolbarButton
        icon={<Grid3x3 className="h-4 w-4" />}
        label="Show the grid"
        active={showGrid}
        onClick={() => setGrid({ showGrid: !showGrid })}
      />
      <ToolbarButton
        icon={<Magnet className="h-4 w-4" />}
        label="Snap to the grid"
        active={snapToGrid}
        onClick={() => setGrid({ snapToGrid: !snapToGrid })}
      />
      <ToolbarButton
        icon={<Waypoints className="h-4 w-4" />}
        label="Alignment guides"
        active={smartGuides}
        onClick={() => setGrid({ smartGuides: !smartGuides })}
      />
      <select
        value={gridSize}
        onChange={(e) => setGrid({ gridSize: Number(e.target.value) })}
        aria-label="Grid size"
        className={cn(fieldCls, "h-7 w-16")}
      >
        {[5, 10, 20, 25].map((n) => (
          <option key={n} value={n}>{n} px</option>
        ))}
      </select>
    </ToolbarGroup>
  );
}

function ShapeControls({ shapes }: { shapes: Shape[] }) {
  const selection = useEditor((s) => s.selection);
  const styleShapes = useEditor((s) => s.styleShapes);
  const styleLines = useEditor((s) => s.styleLines);
  const rotateBy = useEditor((s) => s.rotateBy);
  const style = shapes[0].style;
  const set = (patch: Parameters<typeof styleShapes>[1]) => styleShapes(selection, patch);

  return (
    <>
      <ToolbarGroup>
        <Swatch color={style.fill} label="Fill" glyph={<PaintBucket className="h-3.5 w-3.5" />}>
          {(close) => (
            <ColorGrid
              onPick={(c) => { set({ fill: c }); close(); }}
              extra={<MenuItem onClick={() => { set({ fill: "transparent" }); close(); }}>No fill</MenuItem>}
            />
          )}
        </Swatch>
        <Swatch color={style.stroke} label="Outline" glyph={<Circle className="h-3.5 w-3.5" />}>
          {(close) => (
            <ColorGrid
              onPick={(c) => { set({ stroke: c }); styleLines(selection, { stroke: c }); close(); }}
              extra={<MenuItem onClick={() => { set({ stroke: "transparent" }); close(); }}>No outline</MenuItem>}
            />
          )}
        </Swatch>
        <ToolbarButton
          wide
          icon={<span className="tabular-nums">{style.strokeWidth}px</span>}
          label="Outline weight"
          menu={(close) => (
            <>
              {[0.75, 1, 1.5, 2, 3, 4, 6].map((w) => (
                <MenuItem key={w} active={style.strokeWidth === w} onClick={() => { set({ strokeWidth: w }); styleLines(selection, { strokeWidth: w }); close(); }}>
                  {w}px
                </MenuItem>
              ))}
              <MenuSeparator />
              <MenuLabel>Dash</MenuLabel>
              {DASHES.map((dsh) => (
                <MenuItem key={dsh.label} active={style.dash === dsh.value} onClick={() => { set({ dash: dsh.value }); styleLines(selection, { dash: dsh.value }); close(); }}>
                  {dsh.label}
                </MenuItem>
              ))}
            </>
          )}
        />
      </ToolbarGroup>

      <ToolbarDivider />

      <ToolbarGroup>
        <select
          value={style.fontFamily}
          onChange={(e) => set({ fontFamily: e.target.value })}
          aria-label="Font"
          className={cn(fieldCls, "h-7 w-28")}
        >
          {FONTS.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        <select
          value={style.fontSize}
          onChange={(e) => { set({ fontSize: Number(e.target.value) }); styleLines(selection, { fontSize: Number(e.target.value) }); }}
          aria-label="Font size"
          className={cn(fieldCls, "h-7 w-14")}
        >
          {SIZES.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <MiniButton title="Bold" active={style.bold} onClick={() => set({ bold: !style.bold })}>
          <span className="font-bold">B</span>
        </MiniButton>
        <MiniButton title="Italic" active={style.italic} onClick={() => set({ italic: !style.italic })}>
          <span className="font-serif italic">I</span>
        </MiniButton>
        <MiniButton title="Underline" active={style.underline} onClick={() => set({ underline: !style.underline })}>
          <span className="underline">U</span>
        </MiniButton>
        <Swatch color={style.textColor} label="Text colour" glyph={<span className="text-[11px] font-bold">A</span>}>
          {(close) => (
            <ColorGrid onPick={(c) => { set({ textColor: c }); styleLines(selection, { textColor: c }); close(); }} />
          )}
        </Swatch>
        <MiniButton
          title="Text alignment"
          menu={(close) => (
            <>
              <MenuLabel>Horizontal</MenuLabel>
              {(["left", "center", "right"] as const).map((a) => (
                <MenuItem key={a} active={style.align === a} onClick={() => { set({ align: a }); close(); }}>{a}</MenuItem>
              ))}
              <MenuSeparator />
              <MenuLabel>Vertical</MenuLabel>
              {(["top", "middle", "bottom"] as const).map((a) => (
                <MenuItem key={a} active={style.valign === a} onClick={() => { set({ valign: a }); close(); }}>{a}</MenuItem>
              ))}
            </>
          )}
        >
          <AlignEndHorizontal className="h-4 w-4" />
        </MiniButton>
      </ToolbarGroup>

      <ToolbarDivider />

      <ToolbarGroup>
        <ToolbarButton
          icon={<Droplet className="h-4 w-4" />}
          label="Effects"
          menu={(close) => (
            <>
              <MenuItem active={style.shadow} onClick={() => { set({ shadow: !style.shadow }); close(); }}>
                Drop shadow
              </MenuItem>
              <MenuSeparator />
              <MenuLabel>Opacity</MenuLabel>
              {[1, 0.75, 0.5, 0.25].map((o) => (
                <MenuItem key={o} active={style.opacity === o} onClick={() => { set({ opacity: o }); styleLines(selection, { opacity: o }); close(); }}>
                  {Math.round(o * 100)}%
                </MenuItem>
              ))}
              <MenuSeparator />
              <MenuLabel>Corner rounding</MenuLabel>
              {[0, 4, 8, 16, 28].map((r) => (
                <MenuItem key={r} active={style.radius === r} onClick={() => { set({ radius: r }); close(); }}>{r}px</MenuItem>
              ))}
            </>
          )}
        />
        <ToolbarButton
          icon={<RotateCw className="h-4 w-4" />}
          label="Rotate"
          menu={(close) => (
            <>
              <MenuItem onClick={() => { rotateBy(selection, 90); close(); }}>90° right</MenuItem>
              <MenuItem onClick={() => { rotateBy(selection, -90); close(); }}>90° left</MenuItem>
              <MenuItem onClick={() => { rotateBy(selection, 180); close(); }}>180°</MenuItem>
              <MenuSeparator />
              <MenuItem onClick={() => { useEditor.getState().updateShapes(selection, { rotation: 0 }); close(); }}>
                Reset
              </MenuItem>
            </>
          )}
        />
      </ToolbarGroup>
    </>
  );
}

function LineControls({ ids }: { ids: string[] }) {
  const s = useEditor();
  const page = s.doc.pages[s.pageIndex];
  const line = page.elements.find((e) => e.id === ids[0] && e.kind === "line");
  if (!line || line.kind !== "line") return null;
  const st = line.style;

  return (
    <>
      <ToolbarGroup>
        <Swatch color={st.stroke} label="Line colour" glyph={<Spline className="h-3.5 w-3.5" />}>
          {(close) => <ColorGrid onPick={(c) => { s.styleLines(ids, { stroke: c }); close(); }} />}
        </Swatch>
        <ToolbarButton
          wide
          icon={<span className="tabular-nums">{st.strokeWidth}px</span>}
          label="Line weight"
          menu={(close) => (
            <>
              {[0.75, 1, 1.5, 2, 3, 4, 6].map((w) => (
                <MenuItem key={w} active={st.strokeWidth === w} onClick={() => { s.styleLines(ids, { strokeWidth: w }); close(); }}>{w}px</MenuItem>
              ))}
              <MenuSeparator />
              <MenuLabel>Dash</MenuLabel>
              {DASHES.map((d) => (
                <MenuItem key={d.label} active={st.dash === d.value} onClick={() => { s.styleLines(ids, { dash: d.value }); close(); }}>{d.label}</MenuItem>
              ))}
            </>
          )}
        />
        <ToolbarButton
          icon={<Spline className="h-4 w-4" />}
          label="How the bends are drawn"
          menu={(close) => (
            <>
              <MenuLabel>Through the same bends</MenuLabel>
              {LINE_KINDS.map((k) => (
                <MenuItem key={k.id} active={line.lineKind === k.id} onClick={() => { s.updateLines(ids, { lineKind: k.id }); close(); }}>
                  {k.name}
                </MenuItem>
              ))}
              <MenuSeparator />
              <MenuItem
                disabled={line.waypoints.length === 0}
                onClick={() => { s.updateLines(ids, { waypoints: [] }); close(); }}
              >
                Remove every bend
              </MenuItem>
            </>
          )}
        />
        <ToolbarButton
          icon={<ArrowRight className="h-4 w-4" />}
          label="Arrowheads"
          menu={(close) => (
            <>
              <MenuLabel>End</MenuLabel>
              {ARROWS.map((a) => (
                <MenuItem key={a.value} active={st.endArrow === a.value} onClick={() => { s.styleLines(ids, { endArrow: a.value }); close(); }}>{a.label}</MenuItem>
              ))}
              <MenuSeparator />
              <MenuLabel>Start</MenuLabel>
              {ARROWS.map((a) => (
                <MenuItem key={a.value} active={st.startArrow === a.value} onClick={() => { s.styleLines(ids, { startArrow: a.value }); close(); }}>{a.label}</MenuItem>
              ))}
            </>
          )}
        />
      </ToolbarGroup>
    </>
  );
}

/* -------------------------------------------------------------------------
 * Colour grid
 * ---------------------------------------------------------------------- */

export function ColorGrid({ onPick, extra }: { onPick: (c: string) => void; extra?: React.ReactNode }) {
  return (
    <div className="p-1">
      <div className="grid grid-cols-6 gap-1">
        {PALETTE.map((c) => (
          <button
            key={c}
            type="button"
            title={c}
            onClick={() => onPick(c)}
            className="h-5 w-5 rounded border border-fe-line transition-transform hover:scale-110"
            style={{ background: c }}
          />
        ))}
      </div>
      <label className="mt-2 flex items-center gap-2 px-0.5 text-[11px] text-fe-ink">
        Custom
        <input
          type="color"
          onChange={(e) => onPick(e.target.value)}
          className="h-6 w-10 cursor-pointer bg-transparent"
        />
      </label>
      {extra}
    </div>
  );
}
